/* Teaching timeline, not machine cam timing or operating parameters. */
(() => {
  const stages = [
    { name: '소재 공급', part: 'coil', text: '릴에서 풀린 선재가 패드 홀더를 지나 기계 입구로 들어갑니다. 움직이는 밝은 점은 흐름 표시이며 실제 소재 표식이 아닙니다.', observe: '전체 보기에서 릴 → 패드 홀더 → 롤러 열로 이어지는 선재를 따라가세요.' },
    { name: '교정', part: 'straight', text: '두 롤러 열이 선재의 굽음을 펴는 장면입니다. 첫째 열은 선재 위아래에, 둘째 열은 선재 양옆에 롤러가 번갈아 놓여 있습니다.', observe: '교정은 매 부품마다 새로 시작하는 독립 공정이 아닙니다. 롤러의 구동 여부와 조정량은 확인되지 않았습니다.' },
    { name: '길이 이송', part: 'feed', text: '선재가 축 방향으로 앞으로 나와 핀 머리가 될 길이를 만듭니다. 소재 자체는 축 둘레로 돌지 않습니다.', observe: '두 날과 콜릿이 모두 물러난 상태에서 금색 끝부분이 날 평면을 지나 앞으로 나오는 모습을 보세요.' },
    { name: '절삭', part: 'tools', text: '회전 헤드의 주황색 외경 바이트가 날 평면에서 안쪽으로 들어온 뒤, 선재가 앞으로 나오면서 날을 지난 구간만 가늘어집니다.', observe: '날은 축 방향으로 움직이지 않고, 선재가 움직입니다. 깎인 구간과 아직 깎이지 않은 머리 사이의 턱이 날에서 멀어지는지 보세요. 지름 차이는 과장했습니다.' },
    { name: '끝부분 파지', part: 'counter', text: '카운터 콜릿의 조각들이 핀 머리 쪽으로 모여 잡습니다. 이때 두 날은 모두 물러나 있습니다.', observe: '아래 단면에서 조각과 핀 사이의 틈이 줄어 초록 파지면이 핀에 닿는 순간을 찾으세요.' },
    { name: '절단', part: 'tools', text: '콜릿이 핀을 잡은 채 보라색 절단 날이 날 평면에서 중심으로 들어가 소재와 핀 사이의 목을 끊습니다.', observe: '목이 가늘어지다 사라지면 핀이 분리됩니다. 분리된 핀은 콜릿에 남고, 소재 쪽 끝면과 핀 끝면 사이에 날 두께만큼의 틈이 생깁니다.' },
    { name: '배출·다음 소재', part: 'product', text: '콜릿이 풀린 뒤 다음 소재가 앞으로 나와 날 두께만큼의 틈을 메우고 앞 핀을 콜릿 통로 밖으로 밉니다. 밖으로 나온 핀은 받이에 모입니다.', observe: '배출 원리를 길게 펼친 장면입니다. 실제 배출까지의 이송 거리·소요 사이클·받이 위치는 호기와 제품에 따라 다릅니다.' },
  ];
  // Display units only. Both tools work in one radial plane; the wire carries every feature along x.
  const geo = Object.freeze({
    plane: 1.32, r0: .13, r1: .10, halfBlade: .035, head: .335, shank: 1.185, clear: .13,
    push: 3.2, jawMouth: 2.47, jawLength: .36, jawOpen: .075,
    // Tool outlines in (axial offset from the tool plane, radial offset from the tip).
    turningTool: [[-.17, .45], [.17, .45], [.17, .17], [0, 0], [-.17, .17]],
    partingBlade: [[-.035, .45], [.035, .45], [.035, .012], [.023, 0], [-.023, 0], [-.035, .012]],
  });
  const { plane, r0, r1, halfBlade, head, shank, clear } = geo;
  const fed = head + shank;                 // wire travel when turning ends and parting starts
  const cutMu = plane - fed;                // material coordinate (x at zero feed) of the parting plane
  const shoulderMu = plane - head;          // material that sat in the tool plane when turning began
  const frontMu = plane - halfBlade;        // previous parting face, the front of the bar at zero feed
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const ramp = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
  const smooth = n => n * n * (3 - 2 * n);
  function at(time) {
    const t = clamp(Number.isFinite(time) ? time : 0, 0, 7);
    const stage = Math.min(6, Math.floor(t));
    const u = t === 7 ? 1 : t - stage;
    const advance = stage < 2 ? 0 : stage === 2 ? u : 1;
    let feed = stage < 2 ? 0 : stage === 2 ? head * smooth(u) : fed;
    let turnTip = r0 + clear, partTip = r0 + clear, turn = null, neck = r0;
    if (stage === 3) {
      if (u < .12) turnTip = r0 + clear * (1 - smooth(u / .12));
      else if (u < .25) turnTip = r0 - (r0 - r1) * smooth(ramp(u, .12, .25));
      else if (u < .85) turnTip = r1;
      else turnTip = r1 + (r0 + clear - r1) * smooth(ramp(u, .85, 1));
      feed = head + shank * smooth(ramp(u, .25, .85));
      // Retracting the tool never restores material: keep the deepest radius already cut.
      if (u >= .12) turn = { r: u < .25 ? Math.max(r1, Math.min(r0, turnTip)) : r1, from: plane - feed, to: shoulderMu };
    } else if (stage > 3) turn = { r: r1, from: cutMu, to: shoulderMu };
    if (stage === 5) {
      if (u < .15) partTip = r0 + clear * (1 - smooth(u / .15));
      else if (u < .8) partTip = neck = r0 * (1 - ramp(u, .15, .8));
      else { neck = 0; partTip = (r0 + clear) * smooth(ramp(u, .8, 1)); }
    } else if (stage === 6) neck = 0;
    const grip = stage === 4 ? smooth(ramp(u, .15, .75)) : stage === 5 ? 1 : stage === 6 ? 1 - smooth(ramp(u, 0, .15)) : 0;
    const ejection = stage === 6 ? ramp(u, .15, 1) : 0;
    const push = ejection * (geo.push + 2 * halfBlade);
    feed += push;
    const shift = Math.max(0, push - 2 * halfBlade);
    const separated = stage === 6 || (stage === 5 && u >= .8);
    const turningContact = stage === 3 && u >= .12 && u < .86;
    const partingContact = stage === 5 && u >= .15 && u < .8;
    return { t, stage, u, advance, grip, ejection, neck, feed, push, turn, turnTip, partTip,
      tool: stage === 3 ? turnTip : stage === 5 ? partTip : r0 + clear,
      radius: stage < 3 || !turn ? r0 : turn.r,
      shift, drop: clamp((ejection - .9) / .1, 0, 1) * .65,
      headAngle: t * Math.PI * 2, separated, feedTravel: feed, wireRotation: 0,
      turningContact, partingContact, cutting: turningContact || partingContact };
  }
  // Radius of the bar at material coordinate mu. The turning tool leaves a 45° flank on both sides.
  function radius(mu, s) {
    let r = r0;
    if (s.turn) r = Math.min(r, s.turn.r + Math.max(0, s.turn.from - mu, mu - s.turn.to));
    if (Math.abs(mu - cutMu) <= halfBlade + 1e-9) r = Math.min(r, s.neck);
    return r;
  }
  // Material coordinates of the rings that draw the stock and the finished pin.
  function rings() {
    const e = 1e-4, pin = [cutMu, cutMu + halfBlade, cutMu + halfBlade + e];
    for (let mu = cutMu + halfBlade + .01; mu < frontMu - .004; mu += .01) pin.push(mu);
    pin.push(frontMu);
    const stock = [cutMu - 5.8, cutMu - 4, cutMu - 2.5, cutMu - 1.2, cutMu - .5, cutMu - .2, cutMu - .1];
    for (let mu = cutMu - .09; mu < cutMu - halfBlade - .004; mu += .01) stock.push(mu);
    stock.push(cutMu - halfBlade - e, cutMu - halfBlade, cutMu);
    return { pin, stock };
  }
  // World x of a material point; the finished pin also follows the ejection shift.
  function place(mu, s, onPin) {
    return mu + (onPin ? Math.min(s.feed, fed) + s.shift : s.feed);
  }
  globalThis.D2Cycle = Object.freeze({ stages, at, geo, radius, rings, place, cutMu, frontMu, shoulderMu, fed });
})();
