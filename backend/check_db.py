import asyncio
import aiomysql

async def check():
    try:
        conn = await aiomysql.connect(host='localhost', port=3306, user='root', password='1234')
        cur = await conn.cursor()
        await cur.execute('SHOW DATABASES')
        dbs = await cur.fetchall()
        print("Databases:", dbs)
        
        # Check if voltex_ai exists
        db_names = [d[0] for d in dbs]
        if 'voltex_ai' not in db_names:
            print("Creating voltex_ai database...")
            await cur.execute('CREATE DATABASE voltex_ai')
            print("Database created!")
        else:
            print("voltex_ai database already exists")
            
        # Check tables
        await cur.execute('USE voltex_ai')
        await cur.execute('SHOW TABLES')
        tables = await cur.fetchall()
        print("Tables:", tables)
        
        await cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(check())
