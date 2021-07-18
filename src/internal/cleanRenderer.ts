const debug = false ? console.log : undefined;

export const cleanRenderer = (renderer: string) => {
  debug?.('cleanRenderer', { renderer });

  renderer = renderer
    .toLowerCase()
    // Strip off ANGLE() - for example:
    // 'ANGLE (NVIDIA TITAN Xp)' becomes 'NVIDIA TITAN Xp'':
    .replace(/^angle ?\((.+)\)*$/, '$1')
    // Strip off [number]gb & strip off direct3d and after - for example:
    // 'Radeon (TM) RX 470 Series Direct3D11 vs_5_0 ps_5_0' becomes
    // 'Radeon (TM) RX 470 Series'
    .replace(/\s(\d{1,2}gb|direct3d.+$)|\(r\)| \([^)]+\)$/g, '');

  debug?.('cleanRenderer - renderer cleaned to', { renderer });

  return renderer;
};
