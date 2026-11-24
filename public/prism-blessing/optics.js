// The same radial gradients and sweep, expressed as cached composited layers.
export function opticalPose(width, height, px, py, hyp) {
  const x = width * px / 100, y = height * py / 100;
  return {
    x: x - width / 2, y: y - height / 2,
    radius: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) / width,
    glare: .22 + hyp * .54, gloss: .06 + hyp * .34,
    sweep: (px / 100 - 1) * width * 1.2,
  };
}

export function createOptics(face, write) {
  const holo = face.querySelector('.foil-holo');
  const glare = face.querySelector('.foil-glare');
  const coat = face.querySelector('.foil-clearcoat');
  if (!holo || !glare || !coat) return null;
  glare.innerHTML = '<i class="optic-radial"></i>';
  coat.innerHTML = '<i class="optic-gloss"></i><i class="optic-sweep-mask"><i class="optic-sweep"></i></i>';
  const radial = glare.firstElementChild;
  const gloss = coat.firstElementChild;
  const sweep = coat.querySelector('.optic-sweep');
  face.classList.add('gpu-optics');
  return (width, height, px, py, hyp) => {
    const pose = opticalPose(width, height, px, py, hyp);
    // Scope inherited variables to the foil itself, away from text and artwork.
    write(holo, '--px', px.toFixed(1)); write(holo, '--py', py.toFixed(1)); write(holo, '--hyp', hyp.toFixed(3));
    const move = `translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,0)`;
    write(radial, 'transform', `${move} scale(${pose.radius.toFixed(6)})`);
    write(glare, 'opacity', pose.glare.toFixed(5));
    write(gloss, 'transform', move); write(gloss, 'opacity', pose.gloss.toFixed(5));
    write(sweep, 'transform', `translate3d(${pose.sweep.toFixed(3)}px,0,0)`);
  };
}
