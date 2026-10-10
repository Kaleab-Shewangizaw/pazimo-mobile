import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { freezeWallet } from '@/api/wallet';
import { queryKeys } from '@/queries/keys';

/** The "Freeze your wallet?" dialog's state, shared by the wallet screen and Manage wallet. */
export function useFreezeWallet() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const confirm = useCallback(async () => {
    setFreezing(true);
    try {
      await freezeWallet();
      await queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    } finally {
      setFreezing(false);
      setOpen(false);
    }
  }, [queryClient]);

  return { open, freezing, ask: () => setOpen(true), cancel: () => setOpen(false), confirm };
}
