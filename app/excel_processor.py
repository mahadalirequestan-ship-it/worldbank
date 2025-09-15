import pandas as pd
import asyncio
from sqlalchemy.orm import Session
from app.database import TradeRecord, SessionLocal
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import logging
import time

# Logging sozlash
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ExcelProcessor:
    def __init__(self):
        self.batch_size = 20000
        
    async def process_excel_file(self, file_path: str) -> dict:
        """Excel faylni tez va samarali import qilish"""
        try:
            start_time = time.time()
            logger.info(f"📊 Excel fayl import boshlanadi: {file_path}")
            
            # 1. Excel faylni o'qish
            logger.info("📖 Excel fayl o'qilmoqda...")
            df = await self.read_excel_file(file_path)
            
            if df is None or df.empty:
                return {
                    "success": False,
                    "error": "Excel fayl bo'sh yoki o'qib bo'lmadi",
                    "message": "Fayl formatini tekshiring"
                }
            
            logger.info(f"✅ {len(df)} ta qator o'qildi")
            
            # 2. Ma'lumotlarni tozalash
            logger.info("🧹 Ma'lumotlar tozalanmoqda...")
            df = self.clean_data(df)
            
            # 3. Database ga yuklash
            logger.info("💾 Database ga yuklanmoqda...")
            total_inserted = await self.bulk_insert_parallel(df)
            
            end_time = time.time()
            process_time = end_time - start_time
            
            logger.info(f"🎉 Import yakunlandi: {total_inserted} ta record, {process_time:.2f} soniya")
            
            return {
                "success": True,
                "total_records": len(df),
                "inserted_records": total_inserted,
                "process_time": round(process_time, 2),
                "message": f"✅ Muvaffaqiyatli! {total_inserted:,} ta record {process_time:.2f} soniyada import qilindi"
            }
            
        except Exception as e:
            logger.error(f"❌ Import xatolik: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Import jarayonida xatolik: {str(e)}"
            }
    
    async def read_excel_file(self, file_path: str) -> pd.DataFrame:
        """Excel faylni oddiy usulda o'qish"""
        try:
            # Excel o'qish funksiyasi
            def read_excel_sync():
                # ODDIY USUL: Hamma ustunni string sifatida o'qish
                return pd.read_excel(file_path, dtype=str)
            
            # Separate thread da Excel o'qish
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor(max_workers=1) as executor:
                df = await loop.run_in_executor(executor, read_excel_sync)
            
            # Ustun nomlarini o'zgartirish
            column_mapping = {
                '2 HS code': 'hs_2_code',
                '4 HS code': 'hs_4_code', 
                '6 HS code': 'hs_6_code',
                '10 HS code': 'hs_10_code',
                'Product name': 'product_name',
                'Measure': 'measure',
                'Export volume': 'export_volume',
                'Export price (1000 USD)': 'export_price',
                'Import volume': 'import_volume', 
                'Import price (1000 USD)': 'import_price',
                'Trading partner': 'trading_partner',
                'Year': 'year',
                'HS Group': 'hs_group'
            }
            
            if not df.empty:
                logger.info(f"📋 Asl ustunlar: {list(df.columns)}")
                
                # Ustun nomlarini o'zgartirish
                df = df.rename(columns=column_mapping)
                logger.info(f"📋 Yangi ustunlar: {list(df.columns)}")
            
            return df
            
        except Exception as e:
            logger.error(f"❌ Excel o'qishda xatolik: {str(e)}")
            return None
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Ma'lumotlarni oddiy usulda tozalash"""
        try:
            logger.info(f"🧹 Ma'lumotlar tozalanmoqda... Asl qatorlar: {len(df)}")
            
            # Bo'sh qatorlarni o'chirish
            df = df.dropna(how='all')
            
            # HS kod ustunlari - ODDIY USUL
            hs_columns = ['hs_2_code', 'hs_4_code', 'hs_6_code', 'hs_10_code']
            for col in hs_columns:
                if col in df.columns:
                    # NaN larni bo'sh string bilan almashtirish
                    df[col] = df[col].fillna('')
                    # String sifatida saqlash va faqat tozalash
                    df[col] = df[col].astype(str).str.strip()
                    # 'nan' yozuvini ham bo'sh string bilan almashtirish
                    df[col] = df[col].replace('nan', '')
                    
                    # HS kod namunasini ko'rsatish
                    if len(df) > 0:
                        sample = df[col].iloc[0]
                        logger.info(f"🏷️ {col} namuna: '{sample}'")
            
            # String ustunlar
            string_columns = ['product_name', 'measure', 'trading_partner', 'hs_group']
            for col in string_columns:
                if col in df.columns:
                    df[col] = df[col].fillna('').astype(str).str.strip()
                    df[col] = df[col].replace('nan', '')
                    
                    # Uzunlik cheklash
                    if col == 'product_name':
                        df[col] = df[col].str[:500]
                    else:
                        df[col] = df[col].str[:200]
            
            # Raqamli ustunlar
            numeric_columns = ['export_volume', 'export_price', 'import_volume', 'import_price', 'year']
            for col in numeric_columns:
                if col in df.columns:
                    # String dan raqamga aylantirish
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                    df[col] = df[col].clip(lower=0)
            
            # Year ni tekshirish
            if 'year' in df.columns:
                df['year'] = df['year'].astype(int)
                valid_years = (df['year'] >= 1990) & (df['year'] <= 2030)
                df = df[valid_years]
            
            # Bo'sh product name ni o'chirish
            if 'product_name' in df.columns:
                df = df[df['product_name'].str.len() > 0]
            
            logger.info(f"✅ Tozalangan qatorlar: {len(df)}")
            return df
            
        except Exception as e:
            logger.error(f"❌ Ma'lumot tozalashda xatolik: {str(e)}")
            return df
    
    async def bulk_insert_parallel(self, df: pd.DataFrame) -> int:
        """Parallel bulk insert"""
        try:
            total_inserted = 0
            
            # Ma'lumotlarni batch larga bo'lish
            batches = [df[i:i + self.batch_size] for i in range(0, len(df), self.batch_size)]
            logger.info(f"📦 {len(batches)} ta batch yaratildi")
            
            # Sequential processing
            for i, batch in enumerate(batches):
                logger.info(f"📤 Batch {i+1}/{len(batches)} yuklanmoqda...")
                result = self.insert_batch(batch, i+1)
                total_inserted += result
                
                # Kichik pauza
                await asyncio.sleep(0.1)
            
            logger.info(f"✅ Jami {total_inserted} ta record yozildi")
            return total_inserted
            
        except Exception as e:
            logger.error(f"❌ Bulk insert xatolik: {str(e)}")
            return 0
    
    def insert_batch(self, batch_df: pd.DataFrame, batch_num: int) -> int:
        """Bir batch ni database ga yozish"""
        db = SessionLocal()
        try:
            # DataFrame ni dict formatiga o'tkazish
            records = batch_df.to_dict('records')
            
            # Har bir record ni tozalash
            clean_records = []
            for record in records:
                clean_record = {}
                for key, value in record.items():
                    if pd.isna(value) or str(value).strip() == '' or str(value) == 'nan':
                        if key in ['export_volume', 'export_price', 'import_volume', 'import_price', 'year']:
                            clean_record[key] = 0
                        else:
                            clean_record[key] = ''
                    else:
                        clean_record[key] = value
                clean_records.append(clean_record)
            
            # Database ga yozish
            if clean_records:
                db.bulk_insert_mappings(TradeRecord, clean_records)
                db.commit()
                logger.info(f"✅ Batch {batch_num}: {len(clean_records)} ta record yozildi")
                return len(clean_records)
            else:
                return 0
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Batch {batch_num} xatolik: {str(e)}")
            return 0
        finally:
            db.close()