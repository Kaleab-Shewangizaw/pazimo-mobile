import { getData, postData, postRaw } from '@/api/client';
import { getInstallationId } from '@/lib/installation';
import type {
  PaymentInitiateRequest,
  WalletDeposit,
  WalletDepositMethod,
  WalletOtpSent,
  WalletPayFields,
  WalletPayResult,
  WalletStatementPage,
  WalletSummary,
} from '@/types/api';

/**
 * Pazimo Wallet. Every call carries this install's id: the backend ties a
 * wallet to the phones that verified it with an SMS code, and refuses to
 * spend from any other (see backend services/walletService.js).
 */
async function deviceHeaders() {
  return { headers: { 'X-Installation-Id': await getInstallationId() } };
}

export async function fetchWallet(): Promise<WalletSummary> {
  return getData<WalletSummary>('/wallet', await deviceHeaders());
}

export async function fetchWalletStatement(before?: string): Promise<WalletStatementPage> {
  return getData<WalletStatementPage>('/wallet/entries', {
    ...(await deviceHeaders()),
    params: before ? { before } : undefined,
  });
}

/** Which flow a code is being sent for. Each has its own endpoint pair. */
export type WalletCodePurpose = 'setup' | 'reset_pin' | 'new_device' | 'unfreeze';

const SEND_PATH: Record<WalletCodePurpose, string> = {
  setup: '/wallet/setup/otp',
  reset_pin: '/wallet/pin/reset/otp',
  new_device: '/wallet/devices/otp',
  unfreeze: '/wallet/unfreeze/otp',
};

export async function sendWalletCode(purpose: WalletCodePurpose): Promise<WalletOtpSent> {
  return postData<WalletOtpSent>(SEND_PATH[purpose], {}, await deviceHeaders());
}

export async function completeWalletSetup(code: string, pin: string): Promise<WalletSummary> {
  return postData<WalletSummary>('/wallet/setup', { code, pin }, await deviceHeaders());
}

export async function resetWalletPin(code: string, newPin: string): Promise<WalletSummary> {
  return postData<WalletSummary>('/wallet/pin/reset', { code, newPin }, await deviceHeaders());
}

export async function changeWalletPin(currentPin: string, newPin: string): Promise<void> {
  await postRaw('/wallet/pin/change', { currentPin, newPin }, await deviceHeaders());
}

export async function verifyWalletDevice(code: string): Promise<WalletSummary> {
  return postData<WalletSummary>('/wallet/devices/verify', { code }, await deviceHeaders());
}

export async function freezeWallet(): Promise<WalletSummary> {
  return postData<WalletSummary>('/wallet/freeze', {}, await deviceHeaders());
}

export async function unfreezeWallet(code: string): Promise<WalletSummary> {
  return postData<WalletSummary>('/wallet/unfreeze', { code }, await deviceHeaders());
}

export async function startWalletDeposit(body: {
  amount: number;
  method: WalletDepositMethod;
  phoneNumber?: string;
}): Promise<WalletDeposit> {
  return postData<WalletDeposit>('/wallet/deposits', body, await deviceHeaders());
}

/** Polled while the customer approves the charge; the server asks Chapa on our behalf. */
export async function fetchWalletDeposit(txRef: string): Promise<WalletDeposit> {
  return getData<WalletDeposit>(`/wallet/deposits/${encodeURIComponent(txRef)}`, await deviceHeaders());
}

/**
 * An event ticket paid from the wallet. Same body as the Chapa route — the
 * server prices the order itself — plus the PIN, this install and a retry key.
 */
export function payTicketWithWallet(
  body: Omit<PaymentInitiateRequest, 'method'> & WalletPayFields,
): Promise<WalletPayResult> {
  return postRaw<WalletPayResult>('/tickets/ticket/initiate/wallet', body);
}
