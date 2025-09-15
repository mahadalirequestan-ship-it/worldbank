from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# MySQL database (katta hajm uchun)
DATABASE_URL = "mysql+pymysql://root:password@localhost:3306/trade_data_db"

engine = create_engine(DATABASE_URL)
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

# Database yaratish
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Test connection
def test_mysql_connection():
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        print("MySQL'ga muvaffaqiyatli ulanildi!")
        db.close()
    except Exception as e:
        print(f"MySQL'ga ulanishda xato: {e}")

if __name__ == "__main__":
    test_mysql_connection()