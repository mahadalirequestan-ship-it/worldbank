from app.database import SessionLocal, TradeRecord
import os

def clear_all_data():
    """Barcha ma'lumotlarni o'chirish"""
    db = SessionLocal()
    try:
        # Barcha recordlarni o'chirish
        deleted_count = db.query(TradeRecord).delete()
        db.commit()
        
        print(f"✅ {deleted_count:,} ta record o'chirildi")
        print("✅ Database tozalandi!")
        
        return deleted_count
        
    except Exception as e:
        db.rollback()
        print(f"❌ Xatolik: {e}")
        return 0
    finally:
        db.close()

def get_record_count():
    """Hozirgi record sonini ko'rish"""
    db = SessionLocal()
    try:
        count = db.query(TradeRecord).count()
        print(f"📊 Database da {count:,} ta record mavjud")
        return count
    except Exception as e:
        print(f"❌ Xatolik: {e}")
        return 0
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Hozirgi holat:")
    get_record_count()
    
    choice = input("\n❓ Barcha ma'lumotlarni o'chirasizmi? (ha/yo): ").lower()
    
    if choice in ['ha', 'yes', 'y']:
        print("\n🗑️ Ma'lumotlar o'chirilmoqda...")
        deleted = clear_all_data()
        
        print("\n🔍 Yakuniy holat:")
        get_record_count()
    else:
        print("❌ Bekor qilindi")