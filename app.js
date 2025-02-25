let db;
let currentUser = null;
let companySettings = null;

document.addEventListener('DOMContentLoaded', async () => {
  db = new Database();
  await db.init();
  loadCities();
  setupEventListeners();
  await loadCompanySettings();
  document.getElementById('showHistoryBtn').addEventListener('click', () => checkPassword('history'));
});

function setupEventListeners() {
  document.getElementById('userForm').addEventListener('submit', handleUserRegistration);
  document.getElementById('loginUserForm').addEventListener('submit', handleUserLogin);
  document.getElementById('moneyTransferForm').addEventListener('submit', handleTransfer);
  document.getElementById('showUsersBtn').addEventListener('click', () => checkPassword('users'));
  document.getElementById('switchToLoginBtn').addEventListener('click', switchToLogin);
  document.getElementById('switchToRegisterBtn').addEventListener('click', switchToRegister);
  document.getElementById('showSettingsBtn').addEventListener('click', () => checkPassword('settings'));
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSave);
  document.getElementById('showInfoBtn').addEventListener('click', showInfo);
  document.getElementById('showHistoryBtn').addEventListener('click', () => checkPassword('history'));
  document.getElementById('showReportsBtn').addEventListener('click', showReports);
}

function switchToLogin() {
  document.getElementById('registerForm').classList.add('d-none');
  document.getElementById('loginForm').classList.remove('d-none');
  document.getElementById('loginForm').classList.add('animate-fade-in');
  
  // Clear any previous login form data
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
}

function switchToRegister() {
  document.getElementById('loginForm').classList.add('d-none');
  document.getElementById('registerForm').classList.remove('d-none');
  document.getElementById('registerForm').classList.add('animate-fade-in');
}

async function handleUserLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const user = await db.loginUser(email, password);
    if (user) {
      currentUser = user;
      showTransferForm();
    } else {
      alert('Credenciales incorrectas');
    }
  } catch (error) {
    if (error.message === 'BLOCKED') {
      alert(`Su cuenta ha sido bloqueada por múltiples intentos fallidos.\n\n` +
            `Por favor, póngase en contacto con el administrador del sistema ` +
            `para desbloquear su acceso:\n\n` +
            `CONTACTOS:\n` +
            `Email: enzemajr@gmail.com\n` +
            `WhatsApp: +240 222 084 663`);
    } else {
      alert('Error al iniciar sesión: ' + error.message);
    }
  }
}

function showTransferForm() {
  document.getElementById('registerForm').classList.add('d-none');
  document.getElementById('loginForm').classList.add('d-none');
  document.getElementById('transferForm').classList.remove('d-none');
  document.getElementById('transferForm').classList.add('animate-fade-in');
}

async function loadCities() {
  const cities = await db.getCities();
  const sendCity = document.getElementById('sendCity');
  const receiveCity = document.getElementById('receiveCity');
  
  cities.forEach(city => {
    const option = new Option(city.name, city.id);
    sendCity.add(option.cloneNode(true));
    receiveCity.add(option);
  });
}

async function handleUserRegistration(event) {
  event.preventDefault();
  
  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const dip = document.getElementById('dip').value;
  const password = document.getElementById('password').value;

  // Validaciones
  if (!email.endsWith('@gmail.com')) {
    alert('El correo debe ser de Gmail');
    return;
  }

  if (dip.length !== 9 || isNaN(dip)) {
    alert('El DIP debe ser un número de 9 dígitos');
    return;
  }

  if (password.length !== 8 || 
      !/[A-Z]/.test(password) || 
      !/\d{4}/.test(password)) {
    alert('La contraseña debe tener 8 caracteres, incluir una mayúscula y 4 números');
    return;
  }

  try {
    const registrationTime = new Date();
    const user = { 
      fullName, 
      email, 
      dip, 
      password,
      registrationDate: registrationTime
    };
    
    await db.addUser(user);
    
    // Send registration data to admin email
    try {
      const emailData = {
        to: 'enzemajr@gmail.com',
        subject: 'Nuevo Usuario Registrado - MoneyTransfer GE',
        body: `
          Nuevo usuario registrado:
          Nombre: ${fullName}
          Email: ${email}
          DIP: ${dip}
          Fecha y hora: ${registrationTime.toLocaleString()}
        `
      };
      
      await db.saveRegistrationEmail(emailData);
    } catch (error) {
      console.error('Error saving registration email:', error);
    }
    
    // Instead of setting currentUser and showing transfer form,
    // show success message and prompt to login
    alert('Registro exitoso. Por favor, inicie sesión con sus credenciales.');
    switchToLogin(); // Switch to login form
    
    // Clear registration form
    event.target.reset();
    
  } catch (error) {
    alert('Error al registrar usuario: ' + error.message);
  }
}

async function handleTransfer(event) {
  event.preventDefault();
  
  const password = prompt("Por favor, introduce la contraseña para realizar la transferencia:");
  if (password !== "060793") {
    alert("Contraseña incorrecta. Transferencia cancelada.");
    return;
  }
  
  const sendCitySelect = document.getElementById('sendCity');
  const receiveCitySelect = document.getElementById('receiveCity');
  const amount = document.getElementById('amount').value;
  const senderName = document.getElementById('senderName').value; 
  const receiverName = document.getElementById('receiverName').value;
  const receiverDip = document.getElementById('receiverDip').value;
  const receiverPhone = document.getElementById('receiverPhone').value;

  // Get city names instead of IDs
  const fromCityName = sendCitySelect.options[sendCitySelect.selectedIndex].text;
  const toCityName = receiveCitySelect.options[receiveCitySelect.selectedIndex].text;

  if (sendCitySelect.value === receiveCitySelect.value) {
    alert('La ciudad de envío y recepción no pueden ser la misma');
    return;
  }

  // Validar DIP del receptor
  if (receiverDip.length !== 9 || isNaN(receiverDip)) {
    alert('El DIP del receptor debe ser un número de 9 dígitos');
    return;
  }

  // Validar teléfono
  if (!/^\+?[0-9]{9,}$/.test(receiverPhone.replace(/\s/g, ''))) {
    alert('Por favor, introduce un número de teléfono válido');
    return;
  }

  // Calculate commission
  const commission = calculateCommission(Number(amount));
  
  // Add commission to transfer data
  const transferData = {
    fromCity: fromCityName,
    toCity: toCityName,
    amount: Number(amount),
    commission: commission,
    total: Number(amount) + commission,
    userId: currentUser.email,
    senderName: senderName, 
    receiverName,
    receiverDip,
    receiverPhone,
    date: new Date(),
    reference: generateReference()
  };

  try {
    await db.addTransfer(transferData);
    generateReceipt(transferData);
    alert('Transferencia realizada con éxito');
    event.target.reset();
  } catch (error) {
    alert('Error al realizar la transferencia: ' + error.message);
  }
}

function generateReference() {
  return 'MT-' + Date.now().toString().slice(-8) + 
         Math.random().toString(36).substring(2, 5).toUpperCase();
}

function generateReceipt(transferData) {
  const { jsPDF } = window.jspdf;
  // Create PDF in A5 format (148.5 x 210 mm)
  const doc = new jsPDF({
    format: 'a5',
    unit: 'mm'
  });
  
  // Adjust margin and content positioning for A5
  const margin = 10;
  const pageWidth = 148.5;
  const contentWidth = pageWidth - (margin * 2);
  
  // Logo - calculate dimensions to maintain aspect ratio
  if (companySettings?.logo) {
    const logoImg = new Image();
    logoImg.src = companySettings.logo;
    
    // Calculate logo dimensions while maintaining aspect ratio
    const maxLogoWidth = 50;  // mm
    const maxLogoHeight = 15; // mm
    
    let logoWidth = maxLogoWidth;
    let logoHeight = (logoWidth * logoImg.height) / logoImg.width;
    
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = (logoHeight * logoImg.width) / logoImg.height;
    }
    
    // Center logo horizontally
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(companySettings.logo, 'JPEG', logoX, margin, logoWidth, logoHeight);
  }
  
  // Encabezado
  doc.setFontSize(16);
  doc.text('MoneyTransfer Guinea Ecuatorial', pageWidth/2, 35, { align: 'center' });
  
  if (companySettings?.phone) {
    doc.setFontSize(10);
    doc.text(`Teléfono: ${companySettings.phone}`, pageWidth/2, 42, { align: 'center' });
  }
  
  doc.setFontSize(12);
  doc.text('Comprobante de Transferencia', pageWidth/2, 50, { align: 'center' });
  
  // Set green color for reference text
  doc.setTextColor(0, 128, 0); // RGB values for fresh green
  doc.text(`Referencia: ${transferData.reference}`, pageWidth/2, 57, { align: 'center' });
  // Reset text color back to black for the rest of the document
  doc.setTextColor(0, 0, 0);
  
  // Detalles de la transferencia
  const details = [
    ['Fecha', new Date(transferData.date).toLocaleString()],
    ['Remitente', transferData.senderName],
    ['Ciudad de Envío', transferData.fromCity],
    ['Destinatario', transferData.receiverName],
    ['DIP Destinatario', transferData.receiverDip],
    ['Teléfono Destinatario', transferData.receiverPhone],
    ['Ciudad de Recepción', transferData.toCity],
    ['Monto (XAF)', transferData.amount.toLocaleString()],
    ['Comisión (XAF)', transferData.commission.toLocaleString()],
    ['Total (XAF)', transferData.total.toLocaleString()]
  ];

  doc.autoTable({
    startY: 62,
    head: [['Concepto', 'Detalle']],
    body: details,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: null }
    }
  });
  
  // Espacios para firmas - ajustado para estar más cerca de la tabla
  const finalY = doc.lastAutoTable.finalY + 5;
  
  // Textos de firma
  doc.setFontSize(8);
  doc.text('Firma del Asistente', margin + 30, finalY + 5, { align: 'center' });
  doc.text('Firma del Cliente', pageWidth - margin - 30, finalY + 5, { align: 'center' });
  
  // Líneas para firmas
  doc.setDrawColor(0);
  doc.line(margin, finalY + 10, margin + 60, finalY + 10);
  doc.line(pageWidth - margin - 60, finalY + 10, pageWidth - margin, finalY + 10);
  
  // Pie de página - Ajustado para estar en la parte inferior de la página
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold'); // Establecer texto en negrita
  doc.text('Este es un comprobante oficial de MoneyTransfer GE', pageWidth/2, 200, { align: 'center' }); // Posicionado cerca del final de la página A5
  
  // Guardar PDF
  doc.save(`transferencia_${transferData.reference}.pdf`);
}

async function showUsers() {
  try {
    const users = await db.getUsers();
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'card mb-3 animate-fade-in';
      userCard.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${user.fullName}</h5>
          <p class="card-text">
            <strong>Email:</strong> ${user.email}<br>
            <strong>DIP:</strong> ${user.dip}<br>
            <strong>Estado:</strong> <span class="badge ${user.blocked ? 'bg-danger' : 'bg-success'}">${user.blocked ? 'Bloqueado' : 'Activo'}</span>
          </p>
          <div class="btn-group">
            ${!user.blocked ? 
              `<button class="btn btn-warning btn-sm me-2" onclick="blockUser('${user.email}')">
                <i class="bi bi-lock-fill"></i> Bloquear
              </button>` : 
              `<button class="btn btn-success btn-sm me-2" onclick="unblockUserDirectly('${user.email}')">
                <i class="bi bi-unlock-fill"></i> Desbloquear
              </button>`
            }
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.email}')">
              <i class="bi bi-trash"></i> Eliminar
            </button>
          </div>
        </div>
      `;
      usersList.appendChild(userCard);
    });

    const modal = new bootstrap.Modal(document.getElementById('usersModal'));
    modal.show();
  } catch (error) {
    alert('Error al cargar usuarios: ' + error.message);
  }
}

async function deleteUser(email) {
  const password = prompt("Por favor, introduce la contraseña de administrador:");
  if (password !== "INFOGEST") {
    alert("Contraseña incorrecta");
    return;
  }

  if (confirm('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
    try {
      await db.deleteUser(email);
      await showUsers(); // Refresh the list
      alert('Usuario eliminado con éxito');
    } catch (error) {
      alert('Error al eliminar usuario: ' + error.message);
    }
  }
}

async function blockUser(email) {
  const password = prompt("Por favor, introduce la contraseña de administrador:");
  if (password !== "INFOGEST") {
    alert("Contraseña incorrecta");
    return;
  }

  if (confirm('¿Está seguro de que desea bloquear este usuario?')) {
    try {
      await db.blockUser(email);
      await showUsers(); // Refresh the list
      alert('Usuario bloqueado con éxito');
    } catch (error) {
      alert('Error al bloquear usuario: ' + error.message);
    }
  }
}

async function unblockUserDirectly(email) {
  const password = prompt("Por favor, introduce la contraseña de administrador:");
  if (password !== "INFOGEST") {
    alert("Contraseña incorrecta");
    return;
  }

  try {
    const success = await db.unblockUser(email);
    if (success) {
      await showUsers(); // Refresh the list
      alert('Usuario desbloqueado con éxito');
    } else {
      alert('Usuario no encontrado');
    }
  } catch (error) {
    alert('Error al desbloquear usuario: ' + error.message);
  }
}

async function showTransferHistory() {
  try {
    const transfers = await db.getTransfersByUser(currentUser.email);
    const transfersList = document.getElementById('transfersList');
    transfersList.innerHTML = '';

    transfers.forEach(transfer => {
      const transferCard = document.createElement('div');
      transferCard.className = 'card mb-3 animate-fade-in';
      transferCard.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">Referencia: ${transfer.reference}</h5>
          <p class="card-text">
            <strong>Fecha:</strong> ${new Date(transfer.date).toLocaleString()}<br>
            <strong>Remitente:</strong> ${transfer.senderName}<br>
            <strong>Destinatario:</strong> ${transfer.receiverName}<br>
            <strong>Monto:</strong> ${transfer.amount.toLocaleString()} XAF<br>
            <strong>Ciudad de envío:</strong> ${transfer.fromCity}<br>
            <strong>Ciudad de recepción:</strong> ${transfer.toCity}
          </p>
          <div class="btn-group">
            <button class="btn btn-primary btn-sm me-2" onclick="regenerateReceipt(${JSON.stringify(transfer).replace(/"/g, '&quot;')})">
              <i class="bi bi-download"></i> Descargar Factura
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteTransfer(${transfer.id})">
              <i class="bi bi-trash"></i> Eliminar
            </button>
          </div>
        </div>
      `;
      transfersList.appendChild(transferCard);
    });

    const modal = new bootstrap.Modal(document.getElementById('historyModal'));
    modal.show();
  } catch (error) {
    alert('Error al cargar el historial: ' + error.message);
  }
}

async function deleteTransfer(id) {
  if (confirm('¿Está seguro de que desea eliminar esta transferencia?')) {
    try {
      await db.deleteTransfer(id);
      await showTransferHistory(); // Refresh the list
      alert('Transferencia eliminada con éxito');
    } catch (error) {
      alert('Error al eliminar la transferencia: ' + error.message);
    }
  }
}

async function loadCompanySettings() {
  companySettings = await db.getSettings();
  if (companySettings) {
    document.getElementById('logoPreview').src = companySettings.logo || document.getElementById('logoPreview').src;
    document.getElementById('companyPhone').textContent = companySettings.phone || '';
  }
}

function showSettings() {
  if (companySettings) {
    document.getElementById('phoneInput').value = companySettings.phone || '';
  }
  const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
  modal.show();
}

async function handleSettingsSave(event) {
  event.preventDefault();
  
  const password = prompt("Por favor, introduce la contraseña de administrador:");
  if (password !== "INFOGEST") {
    alert("Contraseña incorrecta");
    return;
  }

  const unblockEmail = document.getElementById('unblockUserEmail').value;
  if (unblockEmail) {
    try {
      const success = await db.unblockUser(unblockEmail);
      if (success) {
        alert('Usuario desbloqueado exitosamente');
      } else {
        alert('Usuario no encontrado');
      }
    } catch (error) {
      alert('Error al desbloquear usuario: ' + error.message);
    }
  }

  const logoInput = document.getElementById('logoInput');
  const phoneInput = document.getElementById('phoneInput');
  
  let logoData = companySettings?.logo;
  
  if (logoInput.files.length > 0) {
    logoData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(logoInput.files[0]);
    });
  }

  const settings = {
    logo: logoData,
    phone: phoneInput.value
  };

  try {
    await db.saveSettings(settings);
    companySettings = settings;
    document.getElementById('logoPreview').src = settings.logo;
    document.getElementById('companyPhone').textContent = settings.phone;
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
  } catch (error) {
    alert('Error al guardar la configuración: ' + error.message);
  }
}

function showInfo() {
  generateComissionTable();
  const modal = new bootstrap.Modal(document.getElementById('infoModal'));
  modal.show();
}

function generateComissionTable() {
  const tableBody = document.getElementById('comissionTable');
  tableBody.innerHTML = '';
  
  // Generate ranges up to 30,000,000 XAF with 20,000 XAF intervals
  const maxAmount = 30000000;
  const interval = 20000;
  const ranges = Math.ceil(maxAmount / interval);
  
  for (let i = 0; i < ranges; i++) {
    const start = i * interval + 1;
    const end = Math.min((i + 1) * interval, maxAmount);
    const commission = (i + 1) * 500; 
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${start.toLocaleString()} - ${end.toLocaleString()}</td>
      <td>${commission.toLocaleString()}</td>
    `;
    tableBody.appendChild(row);
  }
}

function calculateCommission(amount) {
  const baseCommission = 500; 
  const interval = 20000;
  const multiplier = Math.ceil(amount / interval);
  return baseCommission * multiplier;
}

function regenerateReceipt(transfer) {
  try {
    generateReceipt(transfer);
  } catch (error) {
    console.error('Error regenerating receipt:', error);
    alert('Error al regenerar la factura');
  }
}

function checkPassword(action) {
  const password = prompt("Por favor, introduce la contraseña de administrador:");
  if (password === "INFOGEST") {
    switch(action) {
      case 'users':
        showUsers();
        break;
      case 'settings':
        showSettings();
        break;
      case 'history':
        showTransferHistory();
        break;
    }
  } else {
    alert("Contraseña incorrecta. Acceso denegado.");
  }
}

async function viewRegistrationEmails() {
  const password = prompt("Por favor, introduce la contraseña de seguridad:");
  if (password !== "INFOGEST25") {
    alert("Contraseña incorrecta");
    return;
  }

  try {
    const emails = await db.getRegistrationEmails();
    const emailsList = document.getElementById('emailsList');
    emailsList.innerHTML = '';

    emails.forEach(email => {
      const emailCard = document.createElement('div');
      emailCard.className = 'card mb-3 animate-fade-in';
      emailCard.innerHTML = `
        <div class="card-body">
          <pre class="mb-0">${email.body}</pre>
        </div>
      `;
      emailsList.appendChild(emailCard);
    });

    const modal = new bootstrap.Modal(document.getElementById('emailsModal'));
    modal.show();
  } catch (error) {
    alert('Error al cargar los emails: ' + error.message);
  }
}

async function showReports() {
  const password = prompt("Por favor, introduce la contraseña de administrador:");
  if (password !== "INFOGEST") {
    alert("Contraseña incorrecta");
    return;
  }

  try {
    const transfers = await db.getAllTransfers();
    
    // Process data for reports
    const transfersByDay = {};
    const transfersByCity = {};
    const commissionsByDay = {};
    
    transfers.forEach(transfer => {
      // Format date to YYYY-MM-DD
      const date = new Date(transfer.date).toISOString().split('T')[0];
      
      // Transfers by day
      transfersByDay[date] = (transfersByDay[date] || 0) + 1;
      
      // Transfers by city
      transfersByCity[transfer.toCity] = (transfersByCity[transfer.toCity] || 0) + 1;
      
      // Commissions by day
      commissionsByDay[date] = (commissionsByDay[date] || 0) + transfer.commission;
    });

    // Generate charts
    const transfersByDayCtx = document.getElementById('transfersByDayChart').getContext('2d');
    const transfersByCityCtx = document.getElementById('transfersByCityChart').getContext('2d');
    const commissionsByDayCtx = document.getElementById('commissionsByDayChart').getContext('2d');

    // Transfers by day - Bar chart
    new Chart(transfersByDayCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(transfersByDay),
        datasets: [{
          label: 'Transferencias por día',
          data: Object.values(transfersByDay),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

    // Transfers by city - Pie chart
    new Chart(transfersByCityCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(transfersByCity),
        datasets: [{
          data: Object.values(transfersByCity),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          },
          title: {
            display: true,
            text: 'Transferencias por Ciudad'
          }
        }
      }
    });

    // Commissions by day - Bar chart
    new Chart(commissionsByDayCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(commissionsByDay),
        datasets: [{
          label: 'Comisiones por día (XAF)',
          data: Object.values(commissionsByDay),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString() + ' XAF';
              }
            }
          }
        }
      }
    });

    const modal = new bootstrap.Modal(document.getElementById('reportsModal'));
    modal.show();
  } catch (error) {
    alert('Error al generar reportes: ' + error.message);
  }
}