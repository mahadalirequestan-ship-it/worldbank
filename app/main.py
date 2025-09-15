from fastapi import FastAPI, File, UploadFile, Depends, Request, HTTPException, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional
import aiofiles
import os
import csv
import io
from datetime import datetime
from app.database import get_db, TradeRecord
from app.excel_processor import ExcelProcessor
import uuid

app = FastAPI(title="Excel Import Tizimi", description="IMRS ga o'xshash tez Excel import qilish tizimi")

# Static fayllar va templatelar
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Upload papka
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

excel_processor = ExcelProcessor()

@app.get("/home", response_class=HTMLResponse)
async def home_page(request: Request):
    """Home import sahifasi"""
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/", response_class=HTMLResponse) 
async def main_page(request: Request):
    """Dashboard sahifasi"""
    return templates.TemplateResponse("about.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse) 
async def admin_page(request: Request):
    """Admin import sahifasi"""
    return templates.TemplateResponse("admin.html", {"request": request})


# === IMPORT ENDPOINTS ===

@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Excel faylni yuklash va import qilish"""
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Faqat Excel fayl (.xlsx, .xls) yuklash mumkin")
    
    if file.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fayl hajmi 100MB dan oshmasligi kerak")
    
    try:
        file_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        result = await excel_processor.process_excel_file(file_path)
        
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

# === ANALYTICS ENDPOINTS ===

@app.get("/api/filter-options")
async def get_filter_options(db: Session = Depends(get_db)):
    try:
        # Countries
        countries_raw = db.query(distinct(TradeRecord.trading_partner))\
                     .filter(TradeRecord.trading_partner.isnot(None))\
                     .order_by(TradeRecord.trading_partner)\
                     .all()
        
        countries = [c[0] for c in countries_raw if c[0] and c[0].strip()]

        # Products - JAMI sonini hisoblash
        total_products_count = db.query(func.count(distinct(TradeRecord.product_name)))\
                             .filter(TradeRecord.product_name.isnot(None)).scalar()

        # Faqat birinchi 1000 ta mahsulotni olish (tezlik uchun)
        products_raw = db.query(
            TradeRecord.product_name,
            TradeRecord.hs_10_code,
            TradeRecord.hs_6_code
        ).filter(TradeRecord.product_name.isnot(None))\
         .distinct()\
         .limit(1000)\
         .all()
        
        products = []
        for p in products_raw:
            if p[0] and p[0].strip():
                products.append({
                    "name": p[0],
                    "product_name": p[0],
                    "hs_10_code": p[1],
                    "hs_6_code": p[2]
                })

        # Years
        years_raw = db.query(distinct(TradeRecord.year))\
                 .filter(TradeRecord.year > 1990)\
                 .order_by(TradeRecord.year.desc())\
                 .all()
        
        years = [y[0] for y in years_raw if y[0]]

        return {
            "success": True,
            "countries": countries,
            "products": products,
            "years": years,
            "pagination": {
                "total": total_products_count,  # Jami mahsulotlar soni
                "loaded": len(products),        # Yuklangan mahsulotlar soni
                "has_more": len(products) < total_products_count
            }
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    
@app.get("/api/trade-data")
async def get_trade_data(
    country: Optional[str] = None,
    product: Optional[str] = None, 
    year: Optional[int] = None,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """Filtrlangan savdo ma'lumotlarini olish"""
    try:
        query = db.query(TradeRecord)
        
        # Filtrlar qo'llash
        if country:
            query = query.filter(TradeRecord.trading_partner.ilike(f"%{country}%"))
        
        if product:
            query = query.filter(TradeRecord.product_name.ilike(f"%{product}%"))
            
        if year:
            query = query.filter(TradeRecord.year == year)
        
        # Ma'lumotlarni olish
        records = query.order_by(TradeRecord.created_at.desc()).limit(limit).all()
        
        # JSON formatga o'tkazish
        data = []
        for record in records:
            data.append({
                "id": record.id,
                "country": record.trading_partner,
                "product_name": record.product_name,
                "hs_code": record.hs_10_code,
                "year": record.year,
                "import_volume": record.import_volume or 0,
                "import_price": record.import_price or 0,
                "export_volume": record.export_volume or 0,
                "export_price": record.export_price or 0,
                "measure": record.measure,
                "hs_group": record.hs_group
            })
        
        return {
            "success": True,
            "records": data,
            "total": len(data)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "records": [],
            "total": 0
        }

@app.post("/api/get-data")
async def get_filtered_data(
    countries: List[str] = Form(...),
    products: List[str] = Form(...), 
    years: List[int] = Form(...),
    db: Session = Depends(get_db)
):
    """Tanlangan parametrlar bo'yicha ma'lumot olish"""
    try:
        query = db.query(TradeRecord)
        
        # Filtrlar
        if countries:
            query = query.filter(TradeRecord.trading_partner.in_(countries))
        
        if products:
            query = query.filter(TradeRecord.product_name.in_(products))
            
        if years:
            query = query.filter(TradeRecord.year.in_(years))
        
        records = query.all()
        
        # Formatted data
        data = []
        for record in records:
            data.append({
                "country": record.trading_partner,
                "name": record.product_name,
                "code": record.hs_10_code,
                "year": record.year,
                "import_volume": record.import_volume or 0,
                "import_price": record.import_price or 0, 
                "export_volume": record.export_volume or 0,
                "export_price": record.export_price or 0,
                "measure": record.measure,
                "hs_group": record.hs_group
            })
        
        return {
            "success": True,
            "data": data,
            "message": f"{len(data)} ta record topildi"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": []
        }
    
@app.get("/api/export-data")
async def export_data(
    country: Optional[str] = None,
    product: Optional[str] = None,
    year: Optional[int] = None, 
    format: str = "csv",
    db: Session = Depends(get_db)
):
    """Ma'lumotlarni eksport qilish"""
    try:
        query = db.query(TradeRecord)
        
        if country:
            query = query.filter(TradeRecord.trading_partner.ilike(f"%{country}%"))
        if product:
            query = query.filter(TradeRecord.product_name.ilike(f"%{product}%"))
        if year:
            query = query.filter(TradeRecord.year == year)
            
        records = query.all()
        
        if format == "csv":
            return export_as_csv(records)
        else:
            raise HTTPException(status_code=400, detail="Faqat CSV format qo'llab-quvvatlanadi")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def export_as_csv(records):
    """CSV formatda eksport"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'Davlat', 'Mahsulot', 'HS Kod', 'Yil', 'Import Hajmi', 'Import Qiymati ($)', 
        'Export Hajmi', 'Export Qiymati ($)', 'O\'lchov', 'HS Guruh'
    ])
    
    # Data
    for record in records:
        writer.writerow([
            record.trading_partner,
            record.product_name, 
            record.hs_10_code,
            record.year,
            record.import_volume or 0,
            record.import_price or 0,
            record.export_volume or 0, 
            record.export_price or 0,
            record.measure,
            record.hs_group
        ])
    
    output.seek(0)
    
    response = StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trade_data.csv"}
    )
    
    return response
@app.delete("/api/remove-duplicates")
async def remove_duplicates(db: Session = Depends(get_db)):
    """Dublikat recordlarni tozalash"""
    try:
        # Dublikatlarni topish uchun CTE (Common Table Expression) ishlatamiz
        from sqlalchemy import text
        
        # Birinchi, dublikatlarni aniqlash
        duplicate_query = text("""
            WITH duplicates AS (
                SELECT 
                    id,
                    trading_partner,
                    product_name,
                    hs_10_code,
                    year,
                    import_volume,
                    import_price,
                    export_volume,
                    export_price,
                    measure,
                    hs_group,
                    ROW_NUMBER() OVER (
                        PARTITION BY 
                            trading_partner,
                            product_name,
                            hs_10_code,
                            year,
                            COALESCE(import_volume, 0),
                            COALESCE(import_price, 0),
                            COALESCE(export_volume, 0),
                            COALESCE(export_price, 0),
                            COALESCE(measure, ''),
                            COALESCE(hs_group, '')
                        ORDER BY created_at ASC
                    ) as row_num
                FROM trade_records
            )
            SELECT COUNT(*) as duplicate_count
            FROM duplicates 
            WHERE row_num > 1
        """)
        
        # Dublikatlar sonini hisoblash
        result = db.execute(duplicate_query)
        duplicate_count = result.fetchone()[0]
        
        if duplicate_count == 0:
            return {
                "success": True,
                "message": "Dublikat recordlar topilmadi",
                "removed_count": 0
            }
        
        # Dublikatlarni o'chirish (eng eski recorddan tashqari hammasini)
        delete_query = text("""
            DELETE FROM trade_records 
            WHERE id IN (
                SELECT id FROM (
                    SELECT 
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY 
                                trading_partner,
                                product_name,
                                hs_10_code,
                                year,
                                COALESCE(import_volume, 0),
                                COALESCE(import_price, 0),
                                COALESCE(export_volume, 0),
                                COALESCE(export_price, 0),
                                COALESCE(measure, ''),
                                COALESCE(hs_group, '')
                            ORDER BY created_at ASC
                        ) as row_num
                    FROM trade_records
                ) t
                WHERE row_num > 1
            )
        """)
        
        # O'chirish amaliyotini bajarish
        delete_result = db.execute(delete_query)
        db.commit()
        
        removed_count = delete_result.rowcount
        
        return {
            "success": True,
            "message": f"{removed_count} ta dublikat record muvaffaqiyatli o'chirildi",
            "removed_count": removed_count
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Dublikatlarni o'chirishda xatolik: {e}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Dublikatlarni o'chirishda xatolik: {str(e)}",
                "removed_count": 0
            }
        )

@app.get("/api/duplicate-stats")
async def get_duplicate_stats(db: Session = Depends(get_db)):
    """Dublikatlar statistikasini olish"""
    try:
        from sqlalchemy import text
        
        # Jami recordlar soni
        total_records = db.query(TradeRecord).count()
        
        # Dublikatlar sonini hisoblash
        duplicate_query = text("""
            WITH duplicates AS (
                SELECT 
                    trading_partner,
                    product_name,
                    hs_10_code,
                    year,
                    COALESCE(import_volume, 0) as import_volume,
                    COALESCE(import_price, 0) as import_price,
                    COALESCE(export_volume, 0) as export_volume,
                    COALESCE(export_price, 0) as export_price,
                    COALESCE(measure, '') as measure,
                    COALESCE(hs_group, '') as hs_group,
                    COUNT(*) as duplicate_count
                FROM trade_records
                GROUP BY 
                    trading_partner,
                    product_name,
                    hs_10_code,
                    year,
                    COALESCE(import_volume, 0),
                    COALESCE(import_price, 0),
                    COALESCE(export_volume, 0),
                    COALESCE(export_price, 0),
                    COALESCE(measure, ''),
                    COALESCE(hs_group, '')
                HAVING COUNT(*) > 1
            )
            SELECT 
                COUNT(*) as duplicate_groups,
                SUM(duplicate_count - 1) as total_duplicates
            FROM duplicates
        """)
        
        result = db.execute(duplicate_query)
        stats = result.fetchone()
        
        duplicate_groups = stats[0] if stats[0] else 0
        total_duplicates = stats[1] if stats[1] else 0
        
        return {
            "success": True,
            "total_records": total_records,
            "duplicate_groups": duplicate_groups,
            "total_duplicates": total_duplicates,
            "unique_records": total_records - total_duplicates
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "total_records": 0,
                "duplicate_groups": 0,
                "total_duplicates": 0,
                "unique_records": 0
            }
        )
        
@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Database statistikasi"""
    try:
        total_records = db.query(TradeRecord).count()
        
        # Yil bo'yicha statistika
        year_stats = db.query(
            TradeRecord.year,
            func.count(TradeRecord.id)
        ).group_by(TradeRecord.year).all()
        
        # Davlatlar bo'yicha top 10
        country_stats = db.query(
            TradeRecord.trading_partner,
            func.count(TradeRecord.id)
        ).group_by(TradeRecord.trading_partner).order_by(
            func.count(TradeRecord.id).desc()
        ).limit(10).all()
        
        # Import/Export yig'indisi
        import_total = db.query(func.sum(TradeRecord.import_price)).scalar() or 0
        export_total = db.query(func.sum(TradeRecord.export_price)).scalar() or 0
        
        return {
            "total_records": total_records,
            "total_import_value": float(import_total),
            "total_export_value": float(export_total),
            "year_stats": [{"year": year, "count": count} for year, count in year_stats],
            "country_stats": [{"country": country, "count": count} for country, count in country_stats]
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.delete("/clear-data")
async def clear_all_data(db: Session = Depends(get_db)):
    """Barcha ma'lumotlarni o'chirish"""
    try:
        deleted_count = db.query(TradeRecord).delete()
        db.commit()
        
        return {
            "success": True,
            "message": f"{deleted_count} ta record o'chirildi"
        }
        
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)