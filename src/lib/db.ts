import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AppConfig, Registration, AdminUser, AdminUserPermissions } from '../types';

export const CONFIG_DOC = 'config/main';
export const REGISTRATIONS_COL = 'registrations';
export const ADMIN_USERS_COL = 'admin_users';

export const DEFAULT_PERMISSIONS: AdminUserPermissions = {
  canManageConfig: true,
  canManageUsers: true,
  canDeleteRegistrations: true,
  canExportData: true
};

export async function clearAllRegistrations(): Promise<{ success: boolean; message: string }> {
  try {
    const snapshot = await getDocs(collection(db, REGISTRATIONS_COL));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    return { success: true, message: "Todos os cadastros foram apagados." };
  } catch (error: any) {
    console.error("Error clearing registrations: ", error);
    return { success: false, message: "Erro ao apagar cadastros." };
  }
}

export async function importRegistrations(registrations: Omit<Registration, 'id' | 'createdAt'>[]): Promise<{ success: boolean; message: string }> {
  try {
    const addPromises = registrations.map(reg => {
      return addDoc(collection(db, REGISTRATIONS_COL), {
        ...reg,
        isAdmin: false,
        createdAt: Date.now()
      });
    });
    await Promise.all(addPromises);
    return { success: true, message: `${registrations.length} cadastros importados com sucesso.` };
  } catch (error: any) {
    console.error("Error importing registrations: ", error);
    return { success: false, message: "Erro ao importar cadastros." };
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  tshirtSizes: { P: 10, M: 20, G: 20, GG: 10, XG: 5 },
  maxRegistrations: 100,
  isAutoMax: true,
  isActive: true,
  topBannerUrl: "",
  topBannerEnabled: true,
  topBannerScale: 100,
  topBannerPosition: 'center',
  kits: [
    { name: "Kit Simples", imageUrl: "" },
    { name: "Kit Premium", imageUrl: "" }
  ],
  genders: ["Masculino", "Feminino"],
  modalities: ["3Km (Caminhada)", "5Km", "10Km"],
  enablePCD: false,
  showHeader: true,
  pageTitle: "Meu Evento",
  pageTitleColor: "#171717",
  pageSubtitle: "",
  pageSubtitleColor: "#525252",
  pageTitleSize: "grande",
  pageSubtitleSize: "medio",
  pageTitleBold: true,
  pageTitleItalic: false,
  pageSubtitleBold: false,
  pageSubtitleItalic: false,
  allowAdminRegistration: true
};

export async function initConfig() {
  const ref = doc(db, CONFIG_DOC);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, DEFAULT_CONFIG);
  }
}

export async function getConfig(): Promise<AppConfig> {
  const ref = doc(db, CONFIG_DOC);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data() as AppConfig;
  }
  return DEFAULT_CONFIG;
}

export async function updateConfig(config: AppConfig) {
  const ref = doc(db, CONFIG_DOC);
  await setDoc(ref, config);
}

export function subscribeToConfig(callback: (config: AppConfig) => void) {
  return onSnapshot(doc(db, CONFIG_DOC), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as AppConfig);
    }
  });
}

export function subscribeToRegistrations(callback: (regs: Registration[]) => void) {
  return onSnapshot(collection(db, REGISTRATIONS_COL), (snapshot) => {
    const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    callback(regs);
  });
}

export async function getRegistrationByCpf(cpf: string): Promise<Registration | null> {
  const q = query(collection(db, REGISTRATIONS_COL), where("cpf", "==", cpf));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Registration;
  }
  return null;
}

export async function submitRegistration(data: Omit<Registration, 'isAdmin' | 'createdAt' | 'id'> & { id?: string }): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getConfig();
    if (!config.isActive) {
      return { success: false, message: "Os cadastros estão desativados." };
    }

    const snapshot = await getDocs(collection(db, REGISTRATIONS_COL));
    const allRegs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    
    let maxAllowed = config.maxRegistrations;
    if (config.isAutoMax) {
      maxAllowed = Object.values(config.tshirtSizes).reduce((a: number, b: number) => a + b, 0);
    }

    const existingReg = data.id ? allRegs.find(r => r.id === data.id) : allRegs.find(r => r.cpf === data.cpf);
    const isUpdate = !!existingReg;

    if (!isUpdate && allRegs.length >= maxAllowed) {
      return { success: false, message: "Vagas esgotadas!" };
    }

    if (config.isAutoMax && data.kit !== 'Nenhum' && data.tshirtSize) {
      // If updating, don't count their own existing registration in the size limit
      const currentSizeCount = allRegs.filter(r => r.tshirtSize === data.tshirtSize && r.id !== (existingReg?.id)).length;
      const allowedSizeCount = config.tshirtSizes[data.tshirtSize] || 0;
      if (currentSizeCount >= allowedSizeCount) {
        return { success: false, message: `Tamanho ${data.tshirtSize} esgotado. Escolha outro tamanho.` };
      }
    }

    if (isUpdate && existingReg) {
      const ref = doc(db, REGISTRATIONS_COL, existingReg.id as string);
      await setDoc(ref, {
        ...data,
        isAdmin: false,
        createdAt: existingReg.createdAt
      }, { merge: true });
      return { success: true, message: "Cadastro atualizado com sucesso!" };
    } else {
      await addDoc(collection(db, REGISTRATIONS_COL), {
        ...data,
        isAdmin: false,
        createdAt: Date.now()
      });
      return { success: true, message: "Cadastro realizado com sucesso!" };
    }
  } catch (error: any) {
    console.error("Error adding document: ", error);
    return { success: false, message: "Erro ao realizar cadastro. Tente novamente." };
  }
}

export async function deleteRegistration(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const ref = doc(db, REGISTRATIONS_COL, id);
    await deleteDoc(ref);
    return { success: true, message: "Cadastro excluído com sucesso." };
  } catch (error: any) {
    console.error("Error deleting registration: ", error);
    return { success: false, message: "Erro ao excluir cadastro." };
  }
}

export async function getAdminUser(uid: string): Promise<AdminUser | null> {
  try {
    const userRef = doc(db, ADMIN_USERS_COL, uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return { uid: snapshot.id, ...snapshot.data() } as AdminUser;
    }
    return null;
  } catch (error) {
    console.error("Error getting admin user: ", error);
    return null;
  }
}

export async function ensureAdminUserRecord(uid: string, email: string): Promise<AdminUser> {
  const userRef = doc(db, ADMIN_USERS_COL, uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return { uid: snapshot.id, ...snapshot.data() } as AdminUser;
  }

  const allAdminsSnapshot = await getDocs(collection(db, ADMIN_USERS_COL));
  const isFirstAdmin = allAdminsSnapshot.empty;

  const newAdminUser: Omit<AdminUser, 'uid'> = {
    email,
    role: isFirstAdmin ? 'master' : 'admin',
    status: isFirstAdmin ? 'approved' : 'pending',
    createdAt: Date.now(),
    permissions: isFirstAdmin ? DEFAULT_PERMISSIONS : {
      canManageConfig: false,
      canManageUsers: false,
      canDeleteRegistrations: false,
      canExportData: true
    }
  };

  await setDoc(userRef, newAdminUser);
  return { uid, ...newAdminUser };
}

export function subscribeToAdminUsers(callback: (users: AdminUser[]) => void) {
  return onSnapshot(collection(db, ADMIN_USERS_COL), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AdminUser));
    callback(users);
  });
}

export async function updateAdminUserStatus(uid: string, status: 'approved' | 'rejected', approverEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    const userRef = doc(db, ADMIN_USERS_COL, uid);
    await setDoc(userRef, {
      status,
      approvedBy: approverEmail,
      approvedAt: Date.now()
    }, { merge: true });
    return { success: true, message: `Status do usuário atualizado para ${status === 'approved' ? 'Aprovado' : 'Recusado'}.` };
  } catch (error: any) {
    console.error("Error updating admin user status: ", error);
    return { success: false, message: "Erro ao atualizar status do usuário." };
  }
}

export async function updateAdminUserPermissions(uid: string, permissions: AdminUserPermissions): Promise<{ success: boolean; message: string }> {
  try {
    const userRef = doc(db, ADMIN_USERS_COL, uid);
    await setDoc(userRef, { permissions }, { merge: true });
    return { success: true, message: "Permissões do usuário atualizadas com sucesso." };
  } catch (error: any) {
    console.error("Error updating permissions: ", error);
    return { success: false, message: "Erro ao atualizar permissões do usuário." };
  }
}

export async function deleteAdminUserRecord(uid: string): Promise<{ success: boolean; message: string }> {
  try {
    const userRef = doc(db, ADMIN_USERS_COL, uid);
    await deleteDoc(userRef);
    return { success: true, message: "Usuário administrador removido com sucesso." };
  } catch (error: any) {
    console.error("Error deleting admin user: ", error);
    return { success: false, message: "Erro ao remover usuário administrador." };
  }
}

