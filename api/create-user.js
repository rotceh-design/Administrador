const admin = require('firebase-admin');

let initialized = false;

function initAdmin() {
    if (initialized) return;
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.projectId) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        initialized = true;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        initAdmin();

        if (!initialized) {
            return res.status(500).json({ error: 'Firebase Admin no está configurado. Agrega FIREBASE_SERVICE_ACCOUNT en Vercel.' });
        }

        const { email, password, displayName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: displayName || '',
            emailVerified: false
        });

        return res.status(200).json({
            success: true,
            uid: userRecord.uid,
            email: userRecord.email
        });
    } catch (err) {
        console.error('Error creating user:', err);
        const messages = {
            'auth/email-already-exists': 'Este email ya está registrado',
            'auth/invalid-email': 'Email inválido',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres'
        };
        return res.status(400).json({
            error: messages[err.code] || err.message
        });
    }
};
