import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { useTrackPageView } from './useTrackPageView';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

function Harness() {
  useTrackPageView();
  return <div>ok</div>;
}

describe('useTrackPageView', () => {
  it('invoca track-visit en rutas públicas', async () => {
    localStorage.removeItem('rt_analytics_transport');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalled();
    });
  });

  it('no invoca track-visit dentro de /admin', async () => {
    localStorage.removeItem('rt_analytics_transport');
    invokeMock.mockClear();

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Harness />
      </MemoryRouter>,
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
