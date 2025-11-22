const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3001;

// --- ADMIN CONFIG ---
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'sports_db'
});

db.connect(err => {
    if (err) console.error('❌ DB Error:', err.message);
    else console.log('✅ MySQL Connected!');
});

// --- API ---

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        return res.json({ success: true, token: 'admin_token_' + Date.now() });
    }
    res.status(401).json({ success: false, message: 'รหัสผ่านผิด' });
});

// 2. อุปกรณ์ (CRUD)
app.get('/api/equipments', (req, res) => {
    db.query('SELECT * FROM EQUIPMENT', (err, results) => res.json(results));
});

app.post('/api/equipments', (req, res) => {
    const { EquipName, Category, Quantity } = req.body;
    db.query('INSERT INTO EQUIPMENT (EquipName, Category, Quantity, AvailableQty) VALUES (?, ?, ?, ?)', 
    [EquipName, Category, Quantity, Quantity], (err) => {
        if(err) return res.status(500).send(err); res.json({ message: 'Success' });
    });
});

app.put('/api/equipments/:id', (req, res) => {
    const id = req.params.id;
    const { EquipName, Category, Quantity } = req.body;
    db.query('SELECT Quantity, AvailableQty FROM EQUIPMENT WHERE EquipID = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ message: 'Error' });
        
        const diff = Quantity - results[0].Quantity;
        const newAvail = results[0].AvailableQty + diff;

        if (newAvail < 0) return res.status(400).json({ message: 'ลดจำนวนไม่ได้ (ของถูกยืมอยู่)' });

        db.query('UPDATE EQUIPMENT SET EquipName=?, Category=?, Quantity=?, AvailableQty=? WHERE EquipID=?', 
        [EquipName, Category, Quantity, newAvail, id], (err) => {
            if (err) return res.status(500).send(err);
            res.json({ message: '✅ อัปเดตเรียบร้อย' });
        });
    });
});

app.delete('/api/equipments/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM EQUIPMENT WHERE EquipID = ?', [id], (err, result) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(400).json({ message: '❌ ลบไม่ได้: มีคนยืมอยู่' });
            return res.status(500).json({ message: 'Server Error' });
        }
        res.json({ message: '✅ ลบเรียบร้อย' });
    });
});

// 3. นักศึกษา
app.get('/api/students', (req, res) => {
    db.query('SELECT * FROM STUDENT ORDER BY StudentID ASC', (err, r) => res.json(r));
});

app.post('/api/students', (req, res) => {
    const { StudentID, FirstName, LastName, Faculty, Major, Phone } = req.body;
    const sql = `INSERT INTO STUDENT (StudentID, FirstName, LastName, Faculty, Major, Phone) 
                 VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE 
                 FirstName=VALUES(FirstName), LastName=VALUES(LastName), 
                 Faculty=VALUES(Faculty), Major=VALUES(Major), Phone=VALUES(Phone)`;
    db.query(sql, [StudentID, FirstName, LastName, Faculty, Major, Phone], (err) => {
        if(err) return res.status(500).json({message: err.message});
        res.json({message: 'Saved'});
    });
});

// 4. ยืม (รองรับหลายชิ้น)
app.post('/api/borrow', (req, res) => {
    const { StudentID, DueDate, Items } = req.body; 
    const date = new Date().toISOString().split('T')[0];
    
    const checkStudent = `INSERT IGNORE INTO STUDENT (StudentID, FirstName, LastName, Faculty, Major) VALUES (?,'System','Auto','-','-')`;
    
    db.query(checkStudent, [StudentID], (err) => {
        if(err) return res.status(500).send(err);

        db.query('INSERT INTO BORROW (StudentID, BorrowDate, DueDate) VALUES (?, ?, ?)', 
        [StudentID, date, DueDate], (err, res1) => {
            if(err) return res.status(500).send(err);
            const borrowID = res1.insertId;

            Items.forEach(item => {
                db.query('INSERT INTO BORROW_DETAIL (BorrowID, EquipID, Qty) VALUES (?, ?, ?)', [borrowID, item.EquipID, item.Qty]);
                db.query('UPDATE EQUIPMENT SET AvailableQty = AvailableQty - ? WHERE EquipID = ?', [item.Qty, item.EquipID]);
            });
            
            res.json({ message: 'Borrowed' });
        });
    });
});

// 5. คืน & รายงาน
app.get('/api/borrows/active', (req, res) => {
    const sql = `SELECT b.BorrowID, b.StudentID, b.DueDate, e.EquipName, bd.Qty FROM BORROW b JOIN BORROW_DETAIL bd ON b.BorrowID = bd.BorrowID JOIN EQUIPMENT e ON bd.EquipID = e.EquipID WHERE b.Status = 'Borrowed'`;
    db.query(sql, (e, r) => res.json(r));
});

app.post('/api/return', (req, res) => {
    const { BorrowID, ConditionNote, FineAmount } = req.body;
    const date = new Date().toISOString().split('T')[0];
    db.query('INSERT INTO RETURN_RECORD (BorrowID, ReturnDate, ConditionNote, FineAmount) VALUES (?, ?, ?, ?)', [BorrowID, date, ConditionNote, FineAmount], (err) => {
        if(err) return res.status(500).send(err);
        db.query('UPDATE BORROW SET Status = "Returned" WHERE BorrowID = ?', [BorrowID]);
        db.query('SELECT EquipID, Qty FROM BORROW_DETAIL WHERE BorrowID = ?', [BorrowID], (e, items) => {
            items.forEach(i => db.query('UPDATE EQUIPMENT SET AvailableQty = AvailableQty + ? WHERE EquipID = ?', [i.Qty, i.EquipID]));
            res.json({ message: 'Returned' });
        });
    });
});

app.get('/api/history', (req, res) => {
    const sql = `SELECT b.BorrowID, b.StudentID, b.BorrowDate, b.DueDate, b.Status, e.EquipName, bd.Qty, rr.ReturnDate, rr.FineAmount FROM BORROW b JOIN BORROW_DETAIL bd ON b.BorrowID = bd.BorrowID JOIN EQUIPMENT e ON bd.EquipID = e.EquipID LEFT JOIN RETURN_RECORD rr ON b.BorrowID = rr.BorrowID ORDER BY b.BorrowID DESC`;
    db.query(sql, (e, r) => res.json(r));
});

app.get('/api/fines', (req, res) => {
    const sql = `SELECT s.StudentID, s.FirstName, s.LastName, SUM(rr.FineAmount) as TotalFine FROM RETURN_RECORD rr JOIN BORROW b ON rr.BorrowID = b.BorrowID JOIN STUDENT s ON b.StudentID = s.StudentID WHERE rr.FineAmount > 0 GROUP BY s.StudentID HAVING SUM(rr.FineAmount) > 0 ORDER BY TotalFine DESC`;
    db.query(sql, (e, r) => res.json(r));
});

app.get('/api/stats', (req, res) => {
    db.query('SELECT COUNT(*) as t FROM EQUIPMENT', (e, r1) => {
        db.query('SELECT COUNT(*) as a FROM BORROW WHERE Status="Borrowed"', (e, r2) => {
            db.query('SELECT SUM(FineAmount) as f FROM RETURN_RECORD', (e, r3) => {
                res.json({ total: r1[0].t, active: r2[0].a, fine: r3[0].f || 0 });
            });
        });
    });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));