class Database {
  constructor() {
    this.dbName = 'MoneyTransferGE';
    this.dbVersion = 4; 
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Crear store para configuración
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Crear store para usuarios
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'email' });
          userStore.createIndex('dip', 'dip', { unique: true });
        }

        // Crear store para ciudades
        if (!db.objectStoreNames.contains('cities')) {
          const cityStore = db.createObjectStore('cities', { keyPath: 'id', autoIncrement: true });
          // Lista completa actualizada de ciudades de Guinea Ecuatorial
          const cities = [
            'Malabo', 'Bata', 'Ebebiyín', 'Aconibe', 'Añisoc', 'Luba', 
            'Evinayong', 'Mongomo', 'Mengomeyen', 'Micomeseng', 'Nsok', 
            'Niefang', 'Ncue', 'Nsork', 'Bicurga', 'Mbini', 'Djibloho', 
            'Kogo', 'Corisco', 'Riaba', 'Baney', 'Machinda', 'Acurenam', 
            'Nuevo Sopó', 'Nsang', 'Ayene', 'Nsok-Nsomo', 'Nkimi', 
            'Mongomeyen', 'Río Campo', 'Bitika', 'Ayamiken', 'Bidjabidjan', 
            'Mbonde', 'Cogo', 'Andom', 'Akurenam', 'Oyala', 'Basacato', 
            'Rebola', 'Sipopo', 'Ela Nguema', 'Batete', 'Musola', 
            'Ngolo', 'Bolondo', 'Utonde', 'Kusapín', 'Barrio Las Palmas', 
            'Bisun', 'Dibolo', 'Ebomeku'
          ];
          
          const transaction = event.target.transaction;
          const store = transaction.objectStore('cities');
          cities.forEach(city => store.add({ name: city }));
        }

        // Crear store para transferencias
        if (!db.objectStoreNames.contains('transfers')) {
          db.createObjectStore('transfers', { keyPath: 'id', autoIncrement: true });
        }

        // Create store for registration emails
        if (!db.objectStoreNames.contains('registrationEmails')) {
          db.createObjectStore('registrationEmails', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
        }
      };
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      const request = store.put({
        id: 'company',
        ...settings
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSettings() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('company');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addUser(user) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.add(user);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUsers() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCities() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cities'], 'readonly');
      const store = transaction.objectStore('cities');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTransfersByUser(userEmail) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transfers'], 'readonly');
      const store = transaction.objectStore('transfers');
      const request = store.getAll();

      request.onsuccess = () => {
        const transfers = request.result.filter(t => t.userId === userEmail);
        resolve(transfers);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addTransfer(transfer) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transfers'], 'readwrite');
      const store = transaction.objectStore('transfers');
      
      if (!transfer.receiverName || !transfer.receiverDip || !transfer.receiverPhone) {
        reject(new Error('Faltan datos del receptor'));
        return;
      }
      
      const request = store.add(transfer);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTransfer(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transfers'], 'readwrite');
      const store = transaction.objectStore('transfers');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveRegistrationEmail(emailData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['registrationEmails'], 'readwrite');
      const store = transaction.objectStore('registrationEmails');
      const request = store.add(emailData);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getRegistrationEmails() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['registrationEmails'], 'readonly');
      const store = transaction.objectStore('registrationEmails');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async loginUser(email, password) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.get(email);

      request.onsuccess = () => {
        const user = request.result;
        if (!user) {
          resolve(null);
          return;
        }

        // Check if user is blocked
        if (user.blocked) {
          reject(new Error('BLOCKED'));
          return;
        }

        // Check password attempts
        if (!user.loginAttempts) user.loginAttempts = 0;

        if (user.password === password) {
          // Reset login attempts on successful login
          user.loginAttempts = 0;
          store.put(user);
          resolve(user);
        } else {
          // Increment failed attempts
          user.loginAttempts++;
          if (user.loginAttempts >= 3) {
            user.blocked = true;
          }
          store.put(user);
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async unblockUser(email) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.get(email);

      request.onsuccess = () => {
        const user = request.result;
        if (user) {
          user.blocked = false;
          user.loginAttempts = 0;
          const updateRequest = store.put(user);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(email) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.delete(email);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async blockUser(email) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.get(email);

      request.onsuccess = () => {
        const user = request.result;
        if (user) {
          user.blocked = true;
          const updateRequest = store.put(user);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTransfers() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transfers'], 'readonly');
      const store = transaction.objectStore('transfers');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}