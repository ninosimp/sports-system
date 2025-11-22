CREATE DATABASE IF NOT EXISTS sports_db;
USE sports_db;

-- ตารางนักศึกษา (เพิ่ม Major)
CREATE TABLE IF NOT EXISTS STUDENT (
    StudentID VARCHAR(10) PRIMARY KEY,
    FirstName VARCHAR(50),
    LastName VARCHAR(50),
    Faculty VARCHAR(50),
    Major VARCHAR(50),
    Phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS EQUIPMENT (
    EquipID INT AUTO_INCREMENT PRIMARY KEY,
    EquipName VARCHAR(100),
    Category VARCHAR(50),
    Quantity INT,
    AvailableQty INT,
    Status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS BORROW (
    BorrowID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID VARCHAR(10),
    BorrowDate DATE,
    DueDate DATE,
    Status VARCHAR(20) DEFAULT 'Borrowed',
    FOREIGN KEY (StudentID) REFERENCES STUDENT(StudentID)
);

CREATE TABLE IF NOT EXISTS BORROW_DETAIL (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    BorrowID INT,
    EquipID INT,
    Qty INT,
    FOREIGN KEY (BorrowID) REFERENCES BORROW(BorrowID),
    FOREIGN KEY (EquipID) REFERENCES EQUIPMENT(EquipID)
);

CREATE TABLE IF NOT EXISTS RETURN_RECORD (
    ReturnID INT AUTO_INCREMENT PRIMARY KEY,
    BorrowID INT,
    ReturnDate DATE,
    ConditionNote TEXT,
    FineAmount DECIMAL(10,2),
    FOREIGN KEY (BorrowID) REFERENCES BORROW(BorrowID)
);

-- !! ถ้ารันครั้งแรกให้ข้ามบรรทัดนี้ !!
-- แต่ถ้ามีตาราง STUDENT อยู่แล้ว ให้รันบรรทัดนี้เพื่อเพิ่มช่องสาขา:
-- ALTER TABLE STUDENT ADD COLUMN Major VARCHAR(50) AFTER Faculty;

INSERT IGNORE INTO EQUIPMENT (EquipName, Category, Quantity, AvailableQty) VALUES 
('ลูกฟุตบอล', 'Balls', 10, 10),
('ไม้แบดมินตัน', 'Rackets', 20, 20);