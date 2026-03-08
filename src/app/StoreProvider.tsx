'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/lib/store';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [storeInstance] = useState(() => store);

  return <Provider store={storeInstance}>{children}</Provider>;
}
