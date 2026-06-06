const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const MASTER_PBKDF2_ITERATIONS = 600000;
const KEY_PBKDF2_ITERATIONS = 100000;

function deriveKey(password, salt, iterations = MASTER_PBKDF2_ITERATIONS) {
  return crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
}

function generateSalt() {
  return crypto.randomBytes(32);
}

function hashSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { encrypted, iv: iv.toString('hex'), authTag };
}

function decrypt(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class VaultCrypto {
  constructor() {
    this.rek = null;
    this.masterKeySalt = null;
    this.keySalt = null;
    this.encryptedRek = null;
    this.rekIv = null;
    this.rekAuthTag = null;
    this.rekHash = null;
  }

  get isUnlocked() {
    return this.rek !== null;
  }

  setupFromMasterPassword(password) {
    this.masterKeySalt = generateSalt();
    const kek = deriveKey(password, this.masterKeySalt);
    this.rek = crypto.randomBytes(KEY_LENGTH);
    this.rekHash = hashSha256(this.rek);
    const { encrypted, iv, authTag } = encrypt(this.rek.toString('hex'), kek);
    this.encryptedRek = encrypted;
    this.rekIv = iv;
    this.rekAuthTag = authTag;
    this._deriveRecoveryKey('generate', null);
    return {
      keyHash: this.rekHash,
      keySalt: this.keySalt
    };
  }

  _deriveRecoveryKey(mode, customKey) {
    this.keySalt = generateSalt();
    if (mode === 'custom' && customKey) {
      this.rek = deriveKey(customKey, this.keySalt, KEY_PBKDF2_ITERATIONS);
    } else if (mode === 'generate') {
    }
    this.rekHash = hashSha256(this.rek);
  }

  generateRecoveryKey() {
    const rawKey = crypto.randomBytes(KEY_LENGTH);
    this.keySalt = generateSalt();
    this.rek = deriveKey(rawKey.toString('hex'), this.keySalt, KEY_PBKDF2_ITERATIONS);
    this.rekHash = hashSha256(this.rek);
    return rawKey.toString('hex');
  }

  setCustomRecoveryKey(customKey) {
    if (!customKey || customKey.length < 8) {
      throw new Error('Recovery key must be at least 8 characters');
    }
    this.keySalt = generateSalt();
    this.rek = deriveKey(customKey, this.keySalt, KEY_PBKDF2_ITERATIONS);
    this.rekHash = hashSha256(this.rek);
  }

  unlockWithMasterPassword(password) {
    const kek = deriveKey(password, this.masterKeySalt);
    try {
      const rekHex = decrypt(this.encryptedRek, kek, this.rekIv, this.rekAuthTag);
      this.rek = Buffer.from(rekHex, 'hex');
      return true;
    } catch (e) {
      return false;
    }
  }

  unlockWithRecoveryKey(key, keySalt) {
    if (!key || key.length < 8) return false;
    const derivedRek = deriveKey(key, keySalt, KEY_PBKDF2_ITERATIONS);
    const derivedHash = hashSha256(derivedRek);
    if (derivedHash !== this.rekHash) return false;
    this.rek = derivedRek;
    return true;
  }

  verifyRecoveryKey(key, keySalt) {
    if (!key || key.length < 8) return false;
    const derivedRek = deriveKey(key, keySalt, KEY_PBKDF2_ITERATIONS);
    return hashSha256(derivedRek) === this.rekHash;
  }

  encryptPayload(payloadJson) {
    return encrypt(payloadJson, this.rek);
  }

  decryptPayload(encrypted, iv, authTag) {
    return decrypt(encrypted, this.rek, iv, authTag);
  }

  regenerateRecoveryKey(password) {
    if (!this.unlockWithMasterPassword(password)) {
      throw new Error('Invalid master password');
    }
    const newRawKey = crypto.randomBytes(KEY_LENGTH);
    this.keySalt = generateSalt();
    this.rek = deriveKey(newRawKey.toString('hex'), this.keySalt, KEY_PBKDF2_ITERATIONS);
    this.rekHash = hashSha256(this.rek);
    return newRawKey.toString('hex');
  }

  lock() {
    this.rek = null;
  }

  exportHeader() {
    return {
      version: 2,
      masterPasswordSalt: this.masterKeySalt.toString('hex'),
      keySalt: this.keySalt.toString('hex'),
      encryptedRek: this.encryptedRek,
      rekIv: this.rekIv,
      rekAuthTag: this.rekAuthTag,
      rekHash: this.rekHash
    };
  }

  importHeader(header) {
    this.masterKeySalt = Buffer.from(header.masterPasswordSalt, 'hex');
    this.keySalt = Buffer.from(header.keySalt, 'hex');
    this.encryptedRek = header.encryptedRek;
    this.rekIv = header.rekIv;
    this.rekAuthTag = header.rekAuthTag;
    this.rekHash = header.rekHash;
  }
}

module.exports = { VaultCrypto, deriveKey, generateSalt, hashSha256, encrypt, decrypt };
