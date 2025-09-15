# from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker
# from datetime import datetime

# # MySQL database (katta hajm uchun)
# DATABASE_URL = "mysql+pymysql://root:password@localhost:3306/trade_data_db"

# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()

# class TradeRecord(Base):
#     __tablename__ = "trade_records"

#     id = Column(Integer, primary_key=True, index=True, autoincrement=True)
#     hs_2_code = Column(String(2), index=True)
#     hs_4_code = Column(String(4), index=True)
#     hs_6_code = Column(String(6), index=True)
#     hs_10_code = Column(String(10), index=True)
#     product_name = Column(String(500))
#     measure = Column(String(50))
#     export_volume = Column(Float)
#     export_price = Column(Float)
#     import_volume = Column(Float)
#     import_price = Column(Float)
#     trading_partner = Column(String(100))
#     year = Column(Integer, index=True)
#     hs_group = Column(String(200))
#     created_at = Column(DateTime, default=datetime.utcnow)

# # Database yaratish
# Base.metadata.create_all(bind=engine)

# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# # Test connection
# def test_mysql_connection():
#     try:
#         db = SessionLocal()
#         db.execute("SELECT 1")
#         print("MySQL'ga muvaffaqiyatli ulanildi!")
#         db.close()
#     except Exception as e:
#         print(f"MySQL'ga ulanishda xato: {e}")

# if __name__ == "__main__":
#     test_mysql_connection()

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database connection setup with fallback
def setup_database():
    # MySQL connection (production)
    mysql_url = "mysql+pymysql://root:password@localhost:3306/trade_data_db"
    
    # SQLite connection (fallback)
    sqlite_url = "sqlite:///trade_data.db"
    
    try:
        # MySQL'ga ulanishga harakat qiling
        print("MySQL'ga ulanishga harakat qilinmoqda...")
        engine = create_engine(mysql_url, pool_pre_ping=True)
        # Test connection - SQLAlchemy 2.0+ uchun text() ishlatish kerak
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ MySQL'ga muvaffaqiyatli ulanildi!")
        return engine, "mysql"
        
    except Exception as e:
        print(f"❌ MySQL'ga ulanib bo'lmadi: {e}")
        print("🔄 SQLite'ga o'tkazilmoqda...")
        
        try:
            # SQLite'ga fallback
            engine = create_engine(sqlite_url, pool_pre_ping=True)
            # Test connection - SQLAlchemy 2.0+ uchun text() ishlatish kerak
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("✅ SQLite'ga muvaffaqiyatli ulanildi!")
            return engine, "sqlite"
            
        except Exception as sqlite_error:
            print(f"❌ SQLite'ga ham ulanib bo'lmadi: {sqlite_error}")
            raise Exception("Hech qanday database'ga ulanib bo'lmadi!")

# Database engine yaratish
engine, db_type = setup_database()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class TradeRecord(Base):
    __tablename__ = "trade_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hs_2_code = Column(String(2), index=True)
    hs_4_code = Column(String(4), index=True)
    hs_6_code = Column(String(6), index=True)
    hs_10_code = Column(String(10), index=True)
    product_name = Column(String(500))
    measure = Column(String(50))
    export_volume = Column(Float)
    export_price = Column(Float)
    import_volume = Column(Float)
    import_price = Column(Float)
    trading_partner = Column(String(100))
    year = Column(Integer, index=True)
    hs_group = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)

# Database jadvallarini yaratish
try:
    Base.metadata.create_all(bind=engine)
    print(f"✅ Jadvallar {db_type.upper()} da yaratildi!")
except Exception as e:
    print(f"❌ Jadvallar yaratishda xato: {e}")

def get_db():
    """Database session yaratish"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_info():
    """Hozirgi database haqida ma'lumot"""
    return {
        "type": db_type,
        "url": str(engine.url).replace(str(engine.url.password), "***") if engine.url.password else str(engine.url),
        "tables": list(Base.metadata.tables.keys())
    }

def test_database_operations():
    """Database operatsiyalarini test qilish"""
    try:
        db = SessionLocal()
        
        # Connection test - SQLAlchemy 2.0+ uchun
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"✅ Database connection test: {result.fetchone()}")
        
        # Test data qo'shish
        test_record = TradeRecord(
            hs_2_code="01",
            hs_4_code="0101",
            hs_6_code="010101",
            hs_10_code="0101010000",
            product_name="Test Product",
            measure="KG",
            export_volume=100.0,
            export_price=50.0,
            import_volume=80.0,
            import_price=45.0,
            trading_partner="Test Country",
            year=2024,
            hs_group="Test Group"
        )
        
        db.add(test_record)
        db.commit()
        
        # Ma'lumotni o'qish
        record = db.query(TradeRecord).first()
        if record:
            print(f"✅ Test ma'lumot muvaffaqiyatli saqlandi: {record.product_name}")
        
        # Test ma'lumotni o'chirish
        db.delete(record)
        db.commit()
        print("✅ Test ma'lumot o'chirildi")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database operatsiyada xato: {e}")
        return False

# Simple MySQL connection test function
def test_mysql_only():
    """Faqat MySQL uchun test"""
    try:
        mysql_url = "mysql+pymysql://root:password@localhost:3306/trade_data_db"
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"✅ MySQL test: {result.fetchone()}")
        return True
    except Exception as e:
        print(f"❌ MySQL test failed: {e}")
        return False

# Simple SQLite connection test function  
def test_sqlite_only():
    """Faqat SQLite uchun test"""
    try:
        sqlite_url = "sqlite:///trade_data.db"
        engine = create_engine(sqlite_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"✅ SQLite test: {result.fetchone()}")
        return True
    except Exception as e:
        print(f"❌ SQLite test failed: {e}")
        return False

if __name__ == "__main__":
    print("="*50)
    print("DATABASE CONNECTION TEST")
    print("="*50)
    
    # Database ma'lumotlari
    db_info = get_database_info()
    print(f"Database Type: {db_info['type']}")
    print(f"Database URL: {db_info['url']}")
    print(f"Tables: {db_info['tables']}")
    
    print("\n" + "="*50)
    print("TESTING DATABASE OPERATIONS")
    print("="*50)
    
    # Database operatsiyalarini test qilish
    if test_database_operations():
        print("✅ Barcha testlar muvaffaqiyatli!")
    else:
        print("❌ Testlarda xatolik bor!")
    
    print("\n" + "="*50)
    print("INDIVIDUAL CONNECTION TESTS")
    print("="*50)
    
    print("MySQL test:")
    test_mysql_only()
    
    print("\nSQLite test:")
    test_sqlite_only()