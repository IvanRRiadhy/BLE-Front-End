/**
 * Floorplan Detection Subsystem
 * 
 * Exports internal detection models, coordinate transformation utilities,
 * geometry algorithms, text box calculation, and dedicated production serializers.
 */

// Types
export * from './types/detection.js';
export * from './types/production.js';

// Coordinate Transformations
export * from './transforms/coordinateTransform.js';

// Geometry & Visual Center
export * from './geometry/polygon.js';

// Text Box Calculator
export * from './calculator/textBoxCalculator.js';

// Area Auto-naming
export * from './naming/areaNaming.js';

// Production Serializer
export * from './serializer/floorplanSerializer.js';

// Detection Pipeline
export * from './pipeline/pipeline.js';

// Ground Truth Annotation Subsystem
export * from './annotation/types.js';
export * from './annotation/geometry.js';
export * from './annotation/validation.js';
export * from './annotation/serializer.js';

