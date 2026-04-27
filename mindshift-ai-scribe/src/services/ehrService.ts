/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface EHRSyncPayload {
  patientId: string;
  providerName: string;
  date: string;
  note: string;
  billing: {
    cpt: string[];
    icd10: string[];
  };
}

export interface SyncResponse {
  success: boolean;
  message: string;
  syncId?: string;
}

/**
 * Service for integrating with Secure EHR systems.
 */
export async function syncToEHR(payload: EHRSyncPayload): Promise<SyncResponse> {
  try {
    const response = await fetch('/api/ehr/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EHR-Secure-Token': 'MINDSHIFT_SECURE_V3_TOKEN' // Mock token for demo
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `EHR Communication Error (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('EHR Sync Exception:', error);
    throw error instanceof Error ? error : new Error('Network failure: EHR Gateway unreachable.');
  }
}
