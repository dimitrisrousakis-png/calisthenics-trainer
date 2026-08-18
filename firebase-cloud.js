import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDjebSa8N6ay-xE6y74QHL5mG5dk_s7TNo",
  authDomain: "calisthenics-trainer-b191b.firebaseapp.com",
  projectId: "calisthenics-trainer-b191b",
  storageBucket: "calisthenics-trainer-b191b.firebasestorage.app",
  messagingSenderId: "760411202225",
  appId: "1:760411202225:web:e67abfce6f36b10df27890"
};

let initialized = false;
let initializing = false;
let ready = false;
let app = null;
let auth = null;
let db = null;
let currentUser = null;
let syncTimer = null;

window.__firebaseRuntimeReady = true;

function isConfigured(cfg){
  if(!cfg || typeof cfg !== 'object') return false;
  const required = ['apiKey','authDomain','projectId','appId'];
  return required.every(k=>{
    const value = String(cfg[k] || '');
    return value && !value.includes('YOUR_') && !value.includes('YOUR-PROJECT');
  });
}

const configured = isConfigured(firebaseConfig);

function ui(state={}){
  if(typeof window.setCloudUIState === 'function'){
    window.setCloudUIState({
      configured,
      signedIn:!!currentUser,
      email:currentUser?.email || '',
      ...state
    });
  }
}

function friendlyError(err){
  const code = String(err?.code || '');
  if(code.includes('auth/invalid-credential')) return 'Email or password is incorrect.';
  if(code.includes('auth/user-not-found')) return 'No account exists for this email.';
  if(code.includes('auth/wrong-password')) return 'Email or password is incorrect.';
  if(code.includes('auth/email-already-in-use')) return 'An account already exists for this email.';
  if(code.includes('auth/weak-password')) return 'Choose a stronger password.';
  if(code.includes('auth/invalid-email')) return 'The email address is not valid.';
  if(code.includes('auth/too-many-requests')) return 'Too many attempts. Try again later.';
  if(code.includes('auth/operation-not-allowed')) return 'Email/password login is not enabled in Firebase Authentication.';
  if(code.includes('auth/unauthorized-domain')) return 'This GitHub Pages domain is not authorized in Firebase Authentication.';
  if(code.includes('permission-denied')) return 'Firestore Security Rules blocked this request.';
  if(code.includes('unavailable')) return 'Firebase is temporarily unavailable or you are offline.';
  return err?.message || 'Unknown Firebase error.';
}

function localState(){
  if(typeof window.getTrainerLocalState !== 'function'){
    throw new Error('Trainer local state is unavailable.');
  }
  return window.getTrainerLocalState();
}

function mergeById(localItems=[], cloudItems=[], preferLocal=true){
  const map = new Map();
  const first = preferLocal ? cloudItems : localItems;
  const second = preferLocal ? localItems : cloudItems;

  for(const item of first){
    if(item && item.id) map.set(item.id, item);
  }
  for(const item of second){
    if(item && item.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function mergeState(local, cloud){
  const localUpdated = Number(local.localUpdatedAt || 0);
  const cloudUpdated = Number(cloud?.clientUpdatedAt || 0);
  const preferLocal = localUpdated >= cloudUpdated;

  return {
    sessions: mergeById(local.sessions || [], cloud?.sessions || [], preferLocal),
    history: mergeById(local.history || [], cloud?.history || [], preferLocal)
      .sort((a,b)=>String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 200),
    settings: preferLocal
      ? {...(cloud?.settings || {}), ...(local.settings || {})}
      : {...(local.settings || {}), ...(cloud?.settings || {})},
    clientUpdatedAt: Date.now()
  };
}

function stateDoc(){
  return doc(db, 'users', currentUser.uid, 'sync', 'state');
}

function backupDoc(){
  return doc(db, 'users', currentUser.uid, 'backups', 'latest');
}

async function pushState(state, updatedAt){
  await setDoc(stateDoc(), {
    schemaVersion:1,
    sessions:state.sessions || [],
    history:state.history || [],
    settings:state.settings || {},
    clientUpdatedAt:Number(updatedAt || Date.now()),
    syncedAt:serverTimestamp()
  }, {merge:false});

  if(typeof window.recordCloudSyncedAt === 'function'){
    window.recordCloudSyncedAt(Date.now());
  }
}

async function initialMerge(){
  if(!currentUser || !db) return;

  ui({status:'Syncing…', message:'Checking cloud data…'});

  const local = localState();
  const snap = await getDoc(stateDoc());

  if(!snap.exists()){
    const updatedAt = Number(local.localUpdatedAt || Date.now()) || Date.now();
    await pushState(local, updatedAt);

    if(typeof window.applyTrainerCloudState === 'function'){
      window.applyTrainerCloudState(local, updatedAt);
    }

    ui({
      status:'Synced',
      lastSync:Date.now(),
      message:'Cloud sync is ready. This device has been uploaded.'
    });
    return;
  }

  const merged = mergeState(local, snap.data());

  if(typeof window.applyTrainerCloudState === 'function'){
    window.applyTrainerCloudState(merged, merged.clientUpdatedAt);
  }

  await pushState(merged, merged.clientUpdatedAt);

  ui({
    status:'Synced',
    lastSync:Date.now(),
    message:'Local and cloud data were merged successfully.'
  });
}

async function syncNow(showMessage=false){
  if(!ready){
    ui({
      status:'Connecting…',
      message:'Firebase is still initializing. Try again in a moment.',
      error:true
    });
    return;
  }

  if(!currentUser){
    ui({
      message:'Sign in to enable cloud synchronization.',
      error:true
    });
    return;
  }

  if(!navigator.onLine){
    ui({
      status:'Offline',
      message:'Offline: changes remain saved on this device and will sync when you reconnect.'
    });
    return;
  }

  try{
    ui({
      status:'Syncing…',
      message:showMessage ? 'Syncing with Firebase…' : ''
    });

    const local = localState();
    const updatedAt = Number(local.localUpdatedAt || Date.now()) || Date.now();
    const snap = await getDoc(stateDoc());

    if(snap.exists()){
      const merged = mergeState(local, snap.data());

      if(typeof window.applyTrainerCloudState === 'function'){
        window.applyTrainerCloudState(merged, merged.clientUpdatedAt);
      }

      await pushState(merged, merged.clientUpdatedAt);
    }else{
      await pushState(local, updatedAt);
    }

    ui({
      status:'Synced',
      lastSync:Date.now(),
      message:showMessage ? 'Cloud sync complete.' : ''
    });
  }catch(err){
    console.error('Cloud sync failed:', err);
    ui({
      status:'Local saved',
      message:`Cloud sync failed. Local data is still safe. ${friendlyError(err)}`,
      error:true
    });
  }
}

function scheduleSync(){
  if(!ready || !currentUser || !db) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(()=>syncNow(false), 1200);
}

async function createAccount(email,password){
  if(!ready){
    ui({
      status:'Connecting…',
      message:'Firebase is still initializing. Try again in a moment.',
      error:true
    });
    return;
  }

  try{
    ui({status:'Connecting…', message:'Creating account…'});
    await createUserWithEmailAndPassword(auth,email,password);
  }catch(err){
    ui({message:friendlyError(err), error:true});
  }
}

async function signIn(email,password){
  if(!ready){
    ui({
      status:'Connecting…',
      message:'Firebase is still initializing. Try again in a moment.',
      error:true
    });
    return;
  }

  try{
    ui({status:'Connecting…', message:'Signing in…'});
    await signInWithEmailAndPassword(auth,email,password);
  }catch(err){
    ui({message:friendlyError(err), error:true});
  }
}

async function signOutCloud(){
  if(!ready) return;

  try{
    await firebaseSignOut(auth);
  }catch(err){
    ui({message:friendlyError(err), error:true});
  }
}

async function resetPassword(email){
  if(!ready){
    ui({
      status:'Connecting…',
      message:'Firebase is still initializing. Try again in a moment.',
      error:true
    });
    return;
  }

  try{
    await sendPasswordResetEmail(auth,email);
    ui({message:'Password-reset email sent.'});
  }catch(err){
    ui({message:friendlyError(err), error:true});
  }
}

async function backupNow(){
  if(!ready || !currentUser){
    ui({message:'Sign in before creating a cloud backup.', error:true});
    return;
  }

  try{
    const state = localState();

    await setDoc(backupDoc(), {
      schemaVersion:1,
      state:{
        sessions:state.sessions || [],
        history:state.history || [],
        settings:state.settings || {},
        localUpdatedAt:Number(state.localUpdatedAt || Date.now())
      },
      createdAt:serverTimestamp()
    }, {merge:false});

    ui({
      status:'Synced',
      lastSync:Date.now(),
      message:'Cloud backup created.'
    });
  }catch(err){
    ui({
      message:`Cloud backup failed. ${friendlyError(err)}`,
      error:true
    });
  }
}

async function restoreBackup(){
  if(!ready || !currentUser){
    ui({message:'Sign in before restoring a cloud backup.', error:true});
    return;
  }

  try{
    const snap = await getDoc(backupDoc());

    if(!snap.exists()){
      ui({message:'No cloud backup exists yet.', error:true});
      return;
    }

    if(!confirm(
      'Restore the latest cloud backup? This will replace the current local sessions, history and settings, then sync the restored copy back to Firebase.'
    )){
      return;
    }

    const backup = snap.data()?.state;

    if(!backup || !Array.isArray(backup.sessions) || !Array.isArray(backup.history)){
      throw new Error('The stored cloud backup is invalid.');
    }

    const restoredAt = Date.now();

    if(typeof window.applyTrainerCloudState === 'function'){
      window.applyTrainerCloudState(backup, restoredAt);
    }

    await pushState(backup, restoredAt);

    ui({
      status:'Synced',
      lastSync:Date.now(),
      message:'Cloud backup restored successfully.'
    });
  }catch(err){
    ui({
      message:`Restore failed. ${friendlyError(err)}`,
      error:true
    });
  }
}

async function initializeCloud(){
  if(initialized || initializing) return;

  if(!configured){
    ui({
      status:'Setup needed',
      message:'Firebase configuration is missing.',
      error:true
    });
    return;
  }

  if(!navigator.onLine){
    ui({
      status:'Offline',
      message:'You are offline. Connect to the internet to sign in.'
    });
    return;
  }

  initializing = true;

  try{
    ui({
      status:'Connecting…',
      message:'Connecting securely to Firebase…'
    });

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    await setPersistence(auth, browserLocalPersistence);

    ready = true;
    initialized = true;

    onAuthStateChanged(auth, async user=>{
      currentUser = user || null;

      if(currentUser){
        ui({
          status:'Connecting…',
          message:'Signed in. Preparing cloud sync…'
        });

        try{
          await initialMerge();
        }catch(err){
          console.error('Initial cloud merge failed:', err);
          ui({
            status:'Local saved',
            message:`Signed in, but initial sync failed. ${friendlyError(err)}`,
            error:true
          });
        }
      }else{
        ui({
          status:'Ready',
          message:'Enter your account details to continue.'
        });
      }
    });
  }catch(err){
    console.error('Firebase initialization failed:', err);

    ui({
      status:'Connection issue',
      message:`Firebase could not initialize. ${friendlyError(err)}`,
      error:true
    });
  }finally{
    initializing = false;
  }
}

window.trainerCloud = {
  scheduleSync,
  syncNow,
  createAccount,
  signIn,
  signOut:signOutCloud,
  resetPassword,
  backupNow,
  restoreBackup,
  initialize:initializeCloud,
  isReady:()=>ready
};

window.addEventListener('online', ()=>{
  initializeCloud().then(()=>{
    if(currentUser) syncNow(false);
  });
});

window.addEventListener('offline', ()=>{
  ui({
    status:'Offline',
    message:'Offline mode: existing local data remains available, but sign-in requires a connection.'
  });
});

ui({
  status:'Loading…',
  message:'Starting Firebase…'
});

initializeCloud();
