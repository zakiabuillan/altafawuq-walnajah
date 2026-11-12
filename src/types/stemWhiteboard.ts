export type StemCategory = 
  | '3d-shapes'
  | 'physics'
  | 'circuits'
  | 'optics'
  | 'chemistry'
  | 'biology'
  | 'math'
  | 'ai-tools';

export type StemItemType = 
  // 3D Polyhedra & Solids
  | 'cube-3d'
  | 'cuboid-3d'
  | 'cylinder-3d'
  | 'cone-3d'
  | 'sphere-3d'
  | 'hemisphere-3d'
  | 'pyramid-3d'
  | 'triangular-prism-3d'
  | 'tetrahedron-3d'
  | 'capsule-3d'
  | 'torus-3d'
  
  // Physics Mechanics & Dynamics & Waves
  | 'physics-mass'
  | 'physics-cart'
  | 'physics-vector'
  | 'physics-dimension'
  | 'physics-pulley'
  | 'physics-spring'
  | 'physics-incline'
  | 'physics-pendulum'
  | 'physics-wave-transverse'
  | 'physics-wave-longitudinal'

  // Electric Circuits
  | 'circuit-battery'
  | 'circuit-resistor'
  | 'circuit-switch'
  | 'circuit-lamp'
  | 'circuit-ammeter'
  | 'circuit-voltmeter'
  | 'circuit-capacitor'
  | 'circuit-ground'

  // Optics & Light
  | 'optics-concave-lens'
  | 'optics-convex-lens'
  | 'optics-plane-mirror'
  | 'optics-concave-mirror'
  | 'optics-convex-mirror'
  | 'optics-light-ray'
  | 'optics-prism'

  // Chemistry & Laboratory & Atoms & Molecules
  | 'chem-beaker'
  | 'chem-flask'
  | 'chem-test-tube'
  | 'chem-burner'
  | 'chem-burette'
  | 'chem-periodic-card'
  | 'chem-benzene-ring'
  | 'chem-atom-bohr'
  | 'chem-molecule'
  | 'chem-reaction-balancer'
  | 'chem-ph-meter'
  | 'chem-thermometer'

  // Biology & Natural Science & Systems
  | 'bio-cell-animal'
  | 'bio-cell-plant'
  | 'bio-dna'
  | 'bio-microscope'
  | 'bio-photosynthesis'
  | 'bio-digestive-system'
  | 'bio-respiratory-system'
  | 'bio-circulatory-system'
  | 'bio-neuron'
  | 'bio-genetics-punnett'
  | 'bio-food-chain'

  // Mathematics
  | 'math-coordinate-plane'
  | 'math-function-graph'
  | 'math-trig-unit-circle';

export interface StemItemParams {
  // Waves & Oscillations
  amplitude?: number;
  wavelength?: number;
  frequency?: number;
  waveSpeed?: number;
  showWaveNodes?: boolean;

  // Mass & Mechanics
  mass?: number;
  massUnit?: 'kg' | 'g' | 't';
  velocity?: number;
  velocityUnit?: 'm/s' | 'km/h';
  acceleration?: number;
  force?: number;
  forceLabel?: string;
  distance?: number;
  distanceUnit?: 'm' | 'cm' | 'mm' | 'km';
  angle?: number;
  frictionCoeff?: number;
  springConstant?: number;

  // Circuits
  voltage?: number;
  resistance?: number;
  current?: number;
  capacitance?: number;
  power?: number;
  isSwitchClosed?: boolean;
  isLampLit?: boolean;

  // Optics
  focalLength?: number;
  objectDistance?: number;
  imageDistance?: number;
  refractiveIndex?: number;
  rayType?: 'incident' | 'refracted' | 'reflected' | 'axis';

  // Chemistry & Atoms & Molecules
  liquidVolume?: number; // percentage 0-100 or ml
  maxVolume?: number;
  liquidColor?: string;
  fluidName?: string;
  isBoiling?: boolean;
  temperature?: number;
  atomicNumber?: number;
  elementSymbol?: string;
  elementNameAr?: string;
  atomicMass?: number;
  oxidationState?: string;
  protons?: number;
  neutrons?: number;
  electrons?: number;
  electronShells?: number[];
  moleculeFormula?: string;
  moleculeName?: string;
  bondType?: 'single' | 'double' | 'triple' | 'hydrogen';
  phValue?: number;
  phType?: 'acid' | 'neutral' | 'base';
  equationReactants?: string;
  equationProducts?: string;
  isBalanced?: boolean;

  // Biology & Human Systems & Genetics
  activeOrgan?: string;
  showLabels?: boolean;
  heartRate?: number;
  neuronSignalActive?: boolean;
  alleleFather?: [string, string];
  alleleMother?: [string, string];
  traitName?: string;
  trophicLevel?: number;

  // 3D Shapes & Math
  dimensionA?: number; // length / radius / base
  dimensionB?: number; // width / height
  dimensionC?: number; // depth
  unit?: string; // cm, m, px
  volumeFormula?: string;
  areaFormula?: string;
  isWireframe?: boolean;
  shadingColor?: string;
  functionExpression?: string;
  xRange?: [number, number];
  yRange?: [number, number];

  [key: string]: any;
}

export interface StemItem {
  id: string;
  type: StemItemType;
  category: StemCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color: string;
  fillColor?: string;
  label?: string;
  subLabel?: string;
  showLabels?: boolean;
  showFormula?: boolean;
  isLocked?: boolean;
  params: StemItemParams;
}

export interface StemToolDef {
  type: StemItemType;
  category: StemCategory;
  titleAr: string;
  titleEn: string;
  iconName: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  defaultFillColor: string;
  defaultParams: StemItemParams;
  formulas?: {
    volume?: string;
    surfaceArea?: string;
    law?: string;
  };
}
