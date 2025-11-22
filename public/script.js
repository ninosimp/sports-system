const API_URL = '/api';

// เริ่มต้นโหลดข้อมูล
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    await loadEquipments();
    await loadTransactions();
}

// โหลดและแสดงอุปกรณ์
async function loadEquipments() {
    const res = await fetch(`${API_URL}/equipments`);
    const data = await res.json();
    
    // เติมลงตาราง
    const tbody = document.querySelector('#equipTable tbody');
    tbody.innerHTML = data.map(e => `
        <tr>
            <td>${e.EquipID}</td>
            <td>${e.EquipName}</td>
            <td style="color:${e.AvailableQty > 0 ? 'green' : 'red'}; font-weight:bold;">
                ${e.AvailableQty} / ${e.Quantity}
            </td>
            <td><span class="badge badge-active">${e.Status}</span></td>
        </tr>
    `).join('');

    // เติมลง Dropdown
    const select = document.getElementById('equipSelect');
    select.innerHTML = data.map(e => `
        <option value="${e.EquipID}" ${e.AvailableQty === 0 ? 'disabled' : ''}>
            ${e.EquipName} (เหลือ ${e.AvailableQty})
        </option>
    `).join('');
}

// โหลดและแสดงประวัติ
async function loadTransactions() {
    const res = await fetch(`${API_URL}/borrows`);
    const data = await res.json();
    
    const tbody = document.querySelector('#transactionTable tbody');
    tbody.innerHTML = data.map(t => `
        <tr>
            <td>#${t.BorrowID}</td>
            <td>${t.StudentID}</td>
            <td>${t.BorrowDate.split('T')[0]}</td>
            <td>${t.DueDate.split('T')[0]}</td>
            <td><span class="badge ${t.Status === 'Borrowed' ? 'badge-borrowed' : 'badge-returned'}">${t.Status}</span></td>
            <td>
                ${t.Status === 'Borrowed' 
                    ? `<button class="btn-return" onclick="returnItem(${t.BorrowID})">แจ้งคืน</button>` 
                    : `<span style="color:gray; font-size:0.9em">คืนแล้ว (${t.ReturnDate.split('T')[0]})</span>`
                }
            </td>
        </tr>
    `).join('');
}

// จัดการฟอร์มยืม
document.getElementById('borrowForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        StudentID: document.getElementById('studentId').value,
        DueDate: document.getElementById('dueDate').value,
        Items: [{ 
            EquipID: document.getElementById('equipSelect').value, 
            Qty: document.getElementById('qty').value 
        }]
    };

    try {
        const res = await fetch(`${API_URL}/borrow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('✅ ยืมอุปกรณ์สำเร็จ');
            loadData(); // รีโหลดข้อมูลใหม่
        } else {
            alert('❌ เกิดข้อผิดพลาด');
        }
    } catch (err) {
        console.error(err);
    }
});

// ฟังก์ชันคืนของ
async function returnItem(borrowID) {
    const note = prompt("ระบุสภาพอุปกรณ์ (Condition):", "ปกติ");
    if (note === null) return; // กดยกเลิก

    const fine = prompt("ค่าปรับ (ถ้ามี):", "0");

    try {
        const res = await fetch(`${API_URL}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ BorrowID: borrowID, ConditionNote: note, FineAmount: fine })
        });

        if (res.ok) {
            alert('✅ คืนอุปกรณ์เรียบร้อย');
            loadData();
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการคืน');
    }
}