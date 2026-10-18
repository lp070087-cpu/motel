'use client';

import { Component, type ReactNode, type ComponentRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { BoxGeometry, CylinderGeometry, SphereGeometry, MeshStandardMaterial, InstancedMesh, Object3D, Vector3, OrthographicCamera } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Layers3, Minus, Plus, RotateCcw } from 'lucide-react';
import { type Room, type RoomStatus, type Unit, statusLabels, roomLedColor } from '@/lib/domain';
import { architectureLayout, type ArchitectureLayout } from '@/lib/architecture';
import { isoDirection, mapFrame, placeMapLabels } from '@/lib/map-view';
import './RoomMap3D.css';

type Point = [number, number, number];
type Props = { unit?: Unit; rooms: Room[]; visibleIds?: string[]; selectedId: string | null; onSelect: (id: string) => void };
const colors = Object.fromEntries((['available', 'reserved', 'occupied', 'dirty', 'cleaning', 'inspection', 'maintenance', 'blocked'] as RoomStatus[]).map(status => [status, roomLedColor(status)])) as Record<RoomStatus, string>;
// Shared geometry and materials keep all 25–60 suites affordable on modest devices.
const boxGeometry = new BoxGeometry(1, 1, 1);
const roundedGeometry = new RoundedBoxGeometry(1, 1, 1, 2, .06);
const cylinderGeometry = new CylinderGeometry(1, .94, 1, 12);
const leafGeometry = new SphereGeometry(1, 6, 4);
const ledGeometry = new SphereGeometry(.12, 12, 8);
const materials = new Map<string, MeshStandardMaterial>();
function material(color: string, faded: boolean, metal = false) {
  const key = color + faded + metal;
  if (!materials.has(key)) materials.set(key, new MeshStandardMaterial({ color, roughness: metal ? .3 : .82, metalness: metal ? .65 : .02, transparent: faded, opacity: faded ? .22 : 1, depthWrite: !faded }));
  return materials.get(key)!;
}
function Block({ at, size, color = '#e8e0d4', faded = false, metal = false, rounded = false }: { at: Point; size: Point; color?: string; faded?: boolean; metal?: boolean; rounded?: boolean }) {
  return <mesh position={at} scale={size} dispose={null} geometry={rounded ? roundedGeometry : boxGeometry} material={material(color, faded, metal)} castShadow={!faded} receiveShadow />;
}
function Round({ at, radius, height, color, faded = false, scale = [1, 1, 1] }: { at: Point; radius: number; height: number; color: string; faded?: boolean; scale?: Point }) {
  return <mesh position={at} scale={[radius * scale[0], height * scale[1], radius * scale[2]]} dispose={null} geometry={cylinderGeometry} material={material(color, faded)} castShadow={!faded} receiveShadow />;
}

function Plant({ at, faded = false }: { at: Point; faded?: boolean }) {
  return <group position={at}><Round at={[0, .2, 0]} radius={.21} height={.4} color="#a3937e" faded={faded} /><Block at={[0, .58, 0]} size={[.04, .65, .04]} color="#7c7860" faded={faded} />{[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.sin(i * 2) * .14, .65 + i * .07, Math.cos(i * 2) * .14]} rotation={[.3, i * 1.4, .45]} scale={[.18, .35, .12]}><primitive object={leafGeometry} attach="geometry" /><primitive object={material(i % 2 ? '#62735b' : '#7a8867', faded)} attach="material" /></mesh>)}</group>;
}

/** Repeated fine flooring joints share a single draw call for the entire unit. */
function FloorJoints({ layout }: { layout: ArchitectureLayout }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D();
    layout.positions.forEach(([x, , z], index) => {
      for (let joint = 0; joint < 6; joint++) {
        transform.position.set(x - 1.95 + joint * .78, .047, z);
        transform.scale.set(.012, .006, 6.86);
        transform.updateMatrix();
        mesh.current!.setMatrixAt(index * 6 + joint, transform.matrix);
      }
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [layout]);
  return <instancedMesh ref={mesh} args={[boxGeometry, material('#a28a6d', false), layout.positions.length * 6]} dispose={null} />;
}

function Suite({ room, index, layout, selected, faded, onSelect }: { room: Room; index: number; layout: ArchitectureLayout; selected: boolean; faded: boolean; onSelect: Props['onSelect'] }) {
  const special = room.amenities.includes('Hidromassagem');
  const mirror = layout.mirrored[index];
  const accent = layout.accent;
  const select = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(room.id); };
  return <group position={layout.positions[index]}>
    <group rotation={[0, mirror ? Math.PI : 0, 0]} onClick={select} onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      {/* Continuous architectural shell with a door opening onto the central gallery. */}
      <Block at={[0, -.08, 0]} size={[4.9, .18, 7.1]} color={selected ? '#d3b780' : '#aa9174'} faded={faded} />
      <Block at={[0, .025, 0]} size={[4.7, .035, 6.9]} color="#c0aa8b" faded={faded} />
      <Block at={[-2.42, .55, 0]} size={[.14, 1.1, 7.1]} faded={faded} />
      <Block at={[2.42, .55, 0]} size={[.14, 1.1, 7.1]} faded={faded} />
      <Block at={[0, .9, -3.48]} size={[4.9, 1.8, .16]} faded={faded} />
      <Block at={[-1.12, .42, 3.48]} size={[2.6, .84, .16]} faded={faded} />
      <Block at={[2, .42, 3.48]} size={[.86, .84, .16]} faded={faded} />
      <Block at={[.92, .08, 3.5]} size={[1.25, .07, .2]} color={colors[room.status]} faded={faded} />
      <group position={[.3, 0, 3.4]} rotation={[0, -.6, 0]}><Block at={[.49, .48, 0]} size={[.96, .96, .07]} color="#66584a" faded={faded} /><Block at={[.85, .55, -.055]} size={[.08, .05, .05]} color="#cbb17c" metal faded={faded} /></group>
      {/* Bed, layered linen, padded headboard and matched nightstands. */}
      <Block at={[-.85, .66, -3.22]} size={[2.65, 1.25, .22]} color={accent} rounded faded={faded} />
      <Block at={[-.85, .25, -1.89]} size={[2.3, .42, 2.58]} color="#695746" rounded faded={faded} />
      <Block at={[-.85, .52, -1.86]} size={[2.25, .25, 2.55]} color="#eee8dd" rounded faded={faded} />
      <Block at={[-.85, .67, -1.29]} size={[2.3, .1, 1.35]} color={accent} rounded faded={faded} />
      <Block at={[-.85, .73, -.84]} size={[2.32, .055, .39]} color="#d2b98f" faded={faded} />
      {[-1.4, -.3].map(x => <Block key={x} at={[x, .73, -2.68]} size={[.91, .19, .54]} color="#fff9ec" rounded faded={faded} />)}
      {[-2.06, .48].map(x => <group key={x}><Block at={[x, .34, -2.8]} size={[.38, .6, .62]} color="#86705a" faded={faded} /><Round at={[x, .75, -2.8]} radius={.035} height={.25} color="#b89e6d" faded={faded} /><Round at={[x, .92, -2.8]} radius={.16} height={.19} color="#e5d8be" faded={faded} /></group>)}
      <Block at={[-.8, .06, .1]} size={[2.7, .035, 1.28]} color="#e0d7c6" faded={faded} />
      <Block at={[-1.37, .29, .8]} size={[1.65, .42, .62]} color={accent} rounded faded={faded} />
      <Block at={[-1.37, .57, 1.02]} size={[1.65, .42, .16]} color={accent} rounded faded={faded} />
      <Round at={[-.65, .36, .08]} radius={.36} height={.09} color="#695746" faded={faded} />
      <Round at={[-.65, .18, .08]} radius={.06} height={.32} color="#8c7659" faded={faded} />
      <Round at={[-.65, .43, .08]} radius={.1} height={.065} color="#ddd0b7" faded={faded} />
      {/* Stone wet area, modest partition, vanity, mirror and WC. */}
      <Block at={[1.58, .052, -.15]} size={[1.6, .035, 6.5]} color="#d5d0c4" faded={faded} />
      <Block at={[.79, .49, .95]} size={[.1, .94, 4.75]} color="#c4bfb2" faded={faded} />
      <Block at={[1.8, .57, -2.77]} size={[.96, .82, .61]} color="#99866d" faded={faded} />
      <Block at={[1.8, 1, -2.77]} size={[1.05, .09, .68]} color="#f1ece2" faded={faded} />
      <Round at={[1.8, 1.07, -2.77]} radius={.23} height={.13} color="#fbf8ef" scale={[1, 1, .7]} faded={faded} />
      <Block at={[1.8, 1.13, -3.33]} size={[.84, .67, .025]} color="#adc0bc" metal faded={faded} />
      <Round at={[1.77, .25, -1.6]} radius={.24} height={.4} color="#f8f5ec" faded={faded} />
      <Round at={[1.77, .48, -1.58]} radius={.31} height={.1} color="#eee9df" scale={[.9, 1, 1.2]} faded={faded} />
      <Block at={[1.77, .62, -1.95]} size={[.46, .53, .22]} color="#f8f5ec" rounded faded={faded} />
      {special ? <group><Block at={[1.6, .3, 1.05]} size={[1.35, .49, 2.2]} color="#f4eee2" rounded faded={faded} /><Block at={[1.6, .56, 1.05]} size={[1.08, .035, 1.92]} color="#90aaa5" rounded faded={faded} /><Block at={[1.6, .58, 1.05]} size={[.87, .025, 1.69]} color="#abc2ba" rounded faded={faded} /></group> : <group><Block at={[1.62, .12, 1.77]} size={[1.38, .15, 1.36]} color="#ede9df" faded={faded} /><Block at={[1.62, 1.1, 2.4]} size={[1.35, .05, .08]} color="#bda77d" metal faded={faded} /><Block at={[2.28, .69, 1.76]} size={[.025, 1.1, 1.32]} color="#a9c2b9" faded /></group>}
      <Plant at={[-1.93, .06, 2.67]} faded={faded} />
      <Block at={[-.96, .54, 2.9]} size={[1.18, .94, .45]} color="#796650" faded={faded} />
      <Block at={[-.96, .91, 2.65]} size={[.92, .5, .065]} color="#303535" faded={faded} />
      {selected && <mesh position={[0, .09, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.78, 2.83, 64]} /><meshBasicMaterial color="#bd9b5e" transparent opacity={.9} depthWrite={false} /></mesh>}
    </group>
    <mesh position={[.92 * (mirror ? -1 : 1), 1.4, mirror ? -3.4 : 3.4]} geometry={ledGeometry}>
      <meshStandardMaterial color={colors[room.status]} emissive={colors[room.status]} emissiveIntensity={1.1} roughness={.3} transparent={faded} opacity={faded ? .3 : 1} />
    </mesh>
  </group>;
}

type LabelRefs = React.RefObject<Map<string, HTMLButtonElement>>;
function CameraRig({ layout, reset, zoom }: { layout: ArchitectureLayout; reset: number; zoom: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera: baseCamera, invalidate, size, gl } = useThree();
  const camera = baseCamera as OrthographicCamera;
  const frame = useMemo(() => mapFrame(layout, size.width, size.height), [layout, size.width, size.height]);
  const destination = useRef<number | null>(null);
  useLayoutEffect(() => {
    const target = frame.center.clone();
    camera.position.copy(target).addScaledVector(isoDirection, 180);
    camera.lookAt(target);
    const screenUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    target.addScaledVector(screenUp, -frame.offsetY / frame.zoom);
    camera.position.copy(target).addScaledVector(isoDirection, 180);
    camera.lookAt(target);
    camera.zoom = frame.zoom;
    camera.updateProjectionMatrix();
    controls.current?.target.copy(target);
    controls.current?.update();
    destination.current = null;
    invalidate();
  }, [camera, frame, reset, invalidate]);
  useEffect(() => {
    if (!zoom) return;
    destination.current = Math.min(frame.zoom * 8, Math.max(frame.zoom * .65, (destination.current ?? camera.zoom) * (zoom > 0 ? 1.2 : 1 / 1.2)));
    invalidate();
  }, [zoom, camera, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      destination.current = Math.min(frame.zoom * 8, Math.max(frame.zoom * .65, (destination.current ?? camera.zoom) * Math.exp(-Math.max(-300, Math.min(300, event.deltaY)) * .001)));
      invalidate();
    };
    canvas.addEventListener('wheel', wheel, { passive: false, capture: true });
    return () => canvas.removeEventListener('wheel', wheel, { capture: true });
  }, [camera, gl, frame, invalidate]);
  useFrame((_, delta) => {
    if (destination.current === null) return;
    const step = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 - Math.exp(-delta * 9);
    camera.zoom += (destination.current - camera.zoom) * step;
    if (Math.abs(camera.zoom - destination.current) < .001) {
      camera.zoom = destination.current;
      destination.current = null;
    } else invalidate();
    camera.updateProjectionMatrix();
  });
  return <OrbitControls ref={controls} makeDefault enableRotate={false} enableZoom enablePan={false}
    enableDamping={false} zoomSpeed={.65} minZoom={frame.zoom * .65} maxZoom={frame.zoom * 8}
    onStart={() => { destination.current = null; }} />;
}
function ProjectedLabels({ rooms, layout, labels }: { rooms: Room[]; layout: ArchitectureLayout; labels: LabelRefs }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => { invalidate(); }, [rooms, labels, invalidate]);
  useFrame(() => {
    camera.updateMatrixWorld();
    const anchors = rooms.map((room, index) => {
      const [x, y, z] = layout.positions[index];
      const point = new Vector3(x, y + .12, z + (layout.mirrored[index] ? -3.95 : 3.95)).project(camera);
      return { id: room.id, x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2 };
    });
    const placed = new Map(placeMapLabels(anchors, size.width, size.height - 60).map(p => [p.id, p]));
    rooms.forEach(room => {
      const button = labels.current.get(room.id);
      if (!button) return;
      const point = placed.get(room.id);
      button.style.visibility = point ? 'visible' : 'hidden';
      if (point) button.style.transform = 'translate(' + point.x + 'px,' + point.y + 'px) translate(-50%,-50%)';
    });
  });
  return null;
}

function Scene({ rooms, unit, visibleIds, selectedId, onSelect, reset, zoom, labels, onLost }: Props & { reset: number; zoom: number; labels: LabelRefs; onLost: () => void }) {
  const visible = useMemo(() => visibleIds ? new Set(visibleIds) : null, [visibleIds]);
  const unitId = unit?.id ?? rooms[0]?.unitId ?? 'u1';
  const layout = useMemo(() => architectureLayout(unitId, rooms.length), [unitId, rooms.length]);
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  const edge = layout.width / 2 - .8;
  return <>
    <color attach="background" args={['#e8e5dd']} />
    <ambientLight intensity={1.35} />
    <hemisphereLight args={['#fff9ea', '#b3b4aa', 1.35]} />
    <directionalLight position={[-18, 38, 20]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-layout.width} shadow-camera-right={layout.width} shadow-camera-top={layout.depth} shadow-camera-bottom={-layout.depth} shadow-normalBias={.045} shadow-bias={-.0001} shadow-radius={4} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.54, 0]} receiveShadow><planeGeometry args={[300, 300]} /><meshStandardMaterial color="#e8e5dd" roughness={1} /></mesh>
    <Block at={[0, -.3, 0]} size={[layout.width, .42, layout.depth]} color="#c9c5b9" rounded />
    {/* Side circulation connects the facing galleries and entrance thresholds. */}
    <Block at={[layout.entrySide * edge, -.04, 0]} size={[1.9, .15, layout.depth - .5]} color="#d3c8b5" />
    {layout.galleries.map((z, i) => <group key={i}>
      <Block at={[0, -.04, z]} size={[layout.width - .6, .15, 2.8]} color="#d3c8b5" />
      <Block at={[layout.entrySide * (edge + 1), -.08, z]} size={[1.7, .2, 2.6]} color="#bdb5a6" />
      <Block at={[layout.entrySide * (edge + 1.45), -.14, z]} size={[1, .1, 2.6]} color="#d3cbbb" />
      <Plant at={[-layout.entrySide * edge, .05, z + .75]} />
      <Round at={[-layout.entrySide * edge, .17, z - .85]} radius={.27} height={.32} color="#8c806d" />
      <Round at={[-layout.entrySide * edge, .36, z - .85]} radius={.2} height={.06} color="#e4d4b5" />
    </group>)}
    <FloorJoints layout={layout} />
    {rooms.map((room, index) => <Suite key={room.id} room={room} index={index} layout={layout} selected={selectedId === room.id} faded={visible !== null && !visible.has(room.id)} onSelect={onSelect} />)}
    <CameraRig layout={layout} reset={reset} zoom={zoom} />
    <ProjectedLabels rooms={rooms} layout={layout} labels={labels} />
  </>;
}

class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function RoomMap3D(props: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [lost, setLost] = useState(false);
  const [reset, setReset] = useState(0);
  const [zoom, setZoom] = useState(0);
  const labels = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setSupported(Boolean(context));
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { setSupported(false); }
  }, []);
  const selectRoom = (id: string) => { props.onSelect(id); };
  const unavailable = supported !== true || lost;
  const fallback = <div className="rmap-fallback"><Layers3 size={34} /><h3>Suas suítes, sempre acessíveis</h3><p>O mapa 3D está indisponível neste dispositivo. Selecione uma suíte na lista abaixo para continuar a operação.</p></div>;
  return <section className="rmap" aria-label="Maquete arquitetônica interativa das suítes">
    <div className="rmap-toolbar"><div className="rmap-title"><span className="rmap-live-dot" /><span>MAQUETE INTERATIVA</span><small>Arquitetura ilustrativa</small></div><div className="rmap-tools" role="group" aria-label="Controles do mapa"><span className="rmap-camera-note">Isométrica fixa</span><button type="button" aria-label="Aproximar mapa" disabled={unavailable} onClick={() => setZoom(value => Math.abs(value) + 1)}><Plus size={17} /></button><button type="button" aria-label="Afastar mapa" disabled={unavailable} onClick={() => setZoom(value => -Math.abs(value) - 1)}><Minus size={17} /></button><button type="button" title="Restaurar zoom" aria-label="Restaurar zoom e visão geral" disabled={unavailable} onClick={() => { setReset(value => value + 1); }}><RotateCcw size={16} /></button></div></div>
    <div className="rmap-viewport">
      {supported === null ? <div className="rmap-fallback"><Layers3 size={32} /><p>Preparando a maquete…</p></div> : !supported || lost ? fallback : <MapBoundary fallback={fallback} onError={() => setLost(true)}><Canvas orthographic shadows dpr={[1, 1.5]} frameloop="demand" camera={{ position: [26, 32, 29], zoom: 1, near: .1, far: 700 }} gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}><Scene {...props} onSelect={selectRoom} labels={labels} reset={reset} zoom={zoom} onLost={() => setLost(true)} /></Canvas></MapBoundary>}
      {!unavailable && <div className="rmap-label-layer">{props.rooms.map(room => <button key={room.id} type="button"
        ref={element => { if (element) labels.current.set(room.id, element); else labels.current.delete(room.id); }}
        className={'rmap-label' + (props.selectedId === room.id ? ' is-selected' : '') + (props.visibleIds && !props.visibleIds.includes(room.id) ? ' is-faded' : '')}
        style={{ '--suite-status': colors[room.status] } as React.CSSProperties}
        title={'Suíte ' + room.number + ' · ' + statusLabels[room.status]}
        aria-label={'Suíte ' + room.number + ', ' + room.category + ', ' + statusLabels[room.status]}
        aria-pressed={props.selectedId === room.id} onClick={() => selectRoom(room.id)}><i /><strong>{room.number}</strong></button>)}</div>}
      <div className="rmap-compass" aria-hidden="true"><span>N</span><i /><small>ACESSO · GALERIAS</small></div>
      <div className="rmap-instruction">Perspectiva fixa <b>·</b> Role ou use dois dedos para aproximar <b>·</b> Toque em uma suíte</div>
    </div>
    <div className="rmap-legend" aria-label="Legenda de estados"><span><i style={{background: colors.available}} />Disponível</span><span><i style={{background: colors.occupied}} />Ocupada</span><span><i style={{background: colors.cleaning}} />Limpeza / inspeção</span><span><i style={{background: colors.reserved}} />Reservada</span><span><i style={{background: colors.maintenance}} />Manutenção</span><span><i style={{background: colors.blocked}} />Bloqueada</span></div><div className="rmap-foot"><span>Seleção rápida <small>ou pelo mapa</small></span><div className="rmap-room-list" role="group" aria-label="Selecionar suíte">{props.rooms.map(room => <button type="button" key={room.id} className={`${props.selectedId === room.id ? 'is-selected' : ''}${props.visibleIds && !props.visibleIds.includes(room.id) ? ' is-dimmed' : ''}`} style={{ '--suite-status': colors[room.status] } as React.CSSProperties} aria-label={`Suíte ${room.number}, ${statusLabels[room.status]}`} aria-pressed={props.selectedId === room.id} onClick={() => selectRoom(room.id)}><i /><span>{room.number}<small>{statusLabels[room.status]}</small></span></button>)}</div></div>
  </section>;
}
