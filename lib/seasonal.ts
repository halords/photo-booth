/** Shared, resolution-independent artwork for seasonal frames and photo strips. */
export const SEASONAL_THEMES = {
  halloween: {
    name: 'Halloween', sub: 'PGLU Halloween Special', color: '#24182f', ink: '#ffe6b7', accent: '#f5a44b',
    brand: 'P G L U', title: 'Halloween Special', caption: 'Spooky smiles. Lasting memories.',
  },
  christmas: {
    name: 'Christmas', sub: 'A season of togetherness', color: '#173d33', ink: '#fff1d2', accent: '#d9b56e',
    brand: 'MERRY & BRIGHT', title: 'Merry Christmas', caption: 'Making spirits bright.',
  },
} as const;
export type SeasonalTheme = keyof typeof SEASONAL_THEMES;
export function isSeasonal(value: string): value is SeasonalTheme { return value === 'halloween' || value === 'christmas'; }

type Context = CanvasRenderingContext2D;
function star(ctx: Context, x: number, y: number, radius: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, r = i % 2 ? radius * .23 : radius;
    const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function pumpkin(ctx: Context, x: number, y: number, r: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  ctx.fillStyle = '#869369'; ctx.beginPath(); ctx.moveTo(-.13, -.64); ctx.lineTo(-.08, -1); ctx.lineTo(.15, -1.08); ctx.lineTo(.11, -.59); ctx.fill();
  ctx.fillStyle = '#da742d'; ctx.beginPath(); ctx.ellipse(-.35, .03, .55, .71, -.13, 0, Math.PI * 2); ctx.ellipse(.35, .03, .55, .71, .13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4a347'; ctx.beginPath(); ctx.ellipse(0, .05, .51, .74, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#cf722f'; ctx.lineWidth = .035; ctx.beginPath(); ctx.ellipse(0, .05, .3, .71, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#342039'; ctx.beginPath(); ctx.moveTo(-.54, -.05); ctx.lineTo(-.2, -.05); ctx.lineTo(-.37, -.34); ctx.closePath(); ctx.moveTo(.2, -.05); ctx.lineTo(.54, -.05); ctx.lineTo(.37, -.34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-.48, .21); ctx.quadraticCurveTo(0, .76, .48, .21); ctx.lineTo(.15, .31); ctx.lineTo(.1, .46); ctx.lineTo(-.04, .47); ctx.lineTo(-.1, .3); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function bat(ctx: Context, x: number, y: number, r: number, color: string, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(r, r); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-.12, -.12); ctx.lineTo(-.17, -.48); ctx.lineTo(.02, -.28); ctx.lineTo(.2, -.47); ctx.lineTo(.18, -.1);
  ctx.quadraticCurveTo(.5, -.55, 1.15, -.58); ctx.quadraticCurveTo(.84, -.12, 1.04, .24); ctx.quadraticCurveTo(.66, .02, .48, .42); ctx.quadraticCurveTo(.2, .19, .02, .58);
  ctx.quadraticCurveTo(-.2, .19, -.48, .42); ctx.quadraticCurveTo(-.66, .02, -1.04, .24); ctx.quadraticCurveTo(-.84, -.12, -1.15, -.58); ctx.quadraticCurveTo(-.5, -.55, -.12, -.12); ctx.closePath(); ctx.fill(); ctx.restore();
}
function ghost(ctx: Context, x: number, y: number, r: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.fillStyle = '#f9edd8'; ctx.beginPath();
  ctx.moveTo(-.63, .8); ctx.lineTo(-.6, -.12); ctx.bezierCurveTo(-.58, -1, .58, -1, .6, -.12); ctx.lineTo(.65, .8);
  ctx.quadraticCurveTo(.4, .45, .22, .82); ctx.quadraticCurveTo(0, .51, -.2, .83); ctx.quadraticCurveTo(-.4, .51, -.63, .8); ctx.fill();
  ctx.fillStyle = '#38263e'; for (const eye of [-.22, .22]) { ctx.beginPath(); ctx.ellipse(eye, -.1, .09, .14, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, .29, .1, .13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function web(ctx: Context, x: number, y: number, r: number, flip: boolean, color: string) {
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.strokeStyle = color; ctx.globalAlpha = .42; ctx.lineWidth = r * .012;
  for (let spoke = 0; spoke <= 4; spoke++) { const a = spoke * Math.PI / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
  for (const scale of [.28, .52, .77, 1]) {
    ctx.beginPath(); ctx.moveTo(r * scale, 0);
    for (let spoke = 1; spoke <= 4; spoke++) { const a = spoke * Math.PI / 8, mid = a - Math.PI / 16; ctx.quadraticCurveTo(Math.cos(mid) * r * scale * .86, Math.sin(mid) * r * scale * .86, Math.cos(a) * r * scale, Math.sin(a) * r * scale); }
    ctx.stroke();
  }
  ctx.restore();
}
function snowflake(ctx: Context, x: number, y: number, r: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = r * .09; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.moveTo(-r * .25, -r * .51); ctx.lineTo(0, -r * .73); ctx.lineTo(r * .25, -r * .51); ctx.stroke(); }
  ctx.restore();
}
function evergreen(ctx: Context, x: number, y: number, r: number, mirrored = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(mirrored ? -r : r, r); ctx.lineCap = 'round';
  ctx.strokeStyle = '#b8c49c'; ctx.lineWidth = .045; ctx.beginPath(); ctx.moveTo(-.92, -.48); ctx.quadraticCurveTo(0, -.1, .8, .62); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const p = i / 9, bx = -.85 + p * 1.5, by = -.43 + p * .9;
    ctx.strokeStyle = i % 2 ? '#719b77' : '#a8bd8c'; ctx.lineWidth = .05;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + .04, by - .43); ctx.moveTo(bx, by); ctx.lineTo(bx - .36, by + .12); ctx.stroke();
  }
  ctx.fillStyle = '#dd6a5c'; for (const [bx, by] of [[.48, .22], [.64, .4], [.37, .43]]) { ctx.beginPath(); ctx.arc(bx, by, .12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function ornament(ctx: Context, x: number, y: number, r: number) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#d9b56e'; ctx.lineWidth = r * .06; ctx.beginPath(); ctx.moveTo(0, -r * 2); ctx.lineTo(0, -r); ctx.stroke();
  ctx.fillStyle = '#d9b56e'; ctx.fillRect(-r * .22, -r * 1.1, r * .44, r * .28);
  ctx.fillStyle = '#b84d4c'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#eaa47d'; ctx.lineWidth = r * .045; ctx.beginPath(); ctx.ellipse(0, 0, r * .43, r * .97, 0, 0, Math.PI * 2); ctx.stroke();
  star(ctx, 0, 0, r * .42, '#ffe5a9'); ctx.restore();
}

/** Artwork lives in the margins; photos are drawn above it by the composer. */
export function drawSeasonalFrame(ctx: Context, theme: SeasonalTheme, W: number, H: number, photoTop: number, photoBottom: number, ink: string) {
  const accent = SEASONAL_THEMES[theme].accent;
  ctx.save();
  const glow = ctx.createRadialGradient(W * .5, 0, 0, W * .5, 0, W * .95);
  glow.addColorStop(0, theme === 'halloween' ? '#a857582e' : '#b6ce8326'); glow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = accent; ctx.globalAlpha = .55; ctx.lineWidth = W * .0015;
  ctx.strokeRect(W * .013, W * .013, W * .974, H - W * .026); ctx.globalAlpha = 1;
  // Fixed positions keep thumbnails, previews and full-resolution prints identical.
  for (let i = 0, y = photoTop + W * .06; y < photoBottom; y += W * .18, i++) {
    for (const x of [W * .031, W * .969]) {
      if (theme === 'christmas' && i % 3 === 0) snowflake(ctx, x, y, W * .012, ink);
      else if (theme === 'halloween' && i % 3 === 1) bat(ctx, x, y, W * .014, accent, x < W / 2 ? -.4 : .4);
      else star(ctx, x, y, W * (i % 2 ? .009 : .013), i % 2 ? ink : accent);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y + W * .075, W * .002, 0, Math.PI * 2); ctx.fill();
    }
  }
  const headerY = photoTop * .5;
  if (theme === 'halloween') {
    web(ctx, 0, 0, Math.min(photoTop * .82, W * .14), false, ink);
    web(ctx, W, 0, Math.min(photoTop * .82, W * .14), true, ink);
    pumpkin(ctx, W * .105, headerY, W * .042);
    const moonX = W * .887, moonY = headerY - W * .005;
    ctx.fillStyle = '#f7d799'; ctx.beginPath(); ctx.arc(moonX, moonY, W * .037, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cdb68a'; ctx.globalAlpha = .45;
    for (const [dx, dy, r] of [[-.014, -.01, .006], [.012, .012, .009], [.018, -.014, .004]]) { ctx.beginPath(); ctx.arc(moonX + W * dx, moonY + W * dy, W * r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; bat(ctx, W * .892, headerY + W * .015, W * .045, '#38233e', -.15);
    const footerHeight = H - photoBottom, footerY = photoBottom + footerHeight * .64;
    pumpkin(ctx, W * .075, footerY, Math.min(W * .035, footerHeight * .23));
    ghost(ctx, W * .932, footerY, Math.min(W * .037, footerHeight * .24));
    star(ctx, W * .18, headerY * .57, W * .009, accent); star(ctx, W * .79, headerY * .64, W * .008, ink);
  } else {
    evergreen(ctx, W * .071, photoTop * .32, W * .085);
    evergreen(ctx, W * .929, photoTop * .32, W * .085, true);
    ornament(ctx, W * .1, photoTop * .67, W * .026); ornament(ctx, W * .9, photoTop * .67, W * .026);
    snowflake(ctx, W * .075, H - W * .065, Math.min(W * .03, H * .025), ink); evergreen(ctx, W * .92, H - W * .06, W * .054, true);
    star(ctx, W * .19, photoTop * .4, W * .013, accent); star(ctx, W * .81, photoTop * .4, W * .013, accent);
  }
  ctx.restore();
}
