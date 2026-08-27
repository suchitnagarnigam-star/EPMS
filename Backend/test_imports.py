# Test compilation and imports
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("Testing imports...")
try:
    import database
    print("[OK] database.py imported successfully")
    import models
    print("[OK] models.py imported successfully")
    import routers.sync
    print("[OK] routers/sync.py imported successfully")
    import routers.kpis
    print("[OK] routers/kpis.py imported successfully")
    import routers.works
    print("[OK] routers/works.py imported successfully")
    import routers.contractor
    print("[OK] routers/contractor.py imported successfully")
    import routers.data_quality
    print("[OK] routers/data_quality.py imported successfully")
    import main
    print("[OK] main.py imported successfully")
    print("\nAll imports verified successfully! No syntax or import errors.")
except Exception as e:
    print(f"\nImport verification failed: {e}")
    sys.exit(1)
