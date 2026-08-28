/**
 * Firebase Service Contract Adapter
 * Delegates to dataService to maintain compatibility and unified data management.
 */

import { dataService } from './dataService';

export const firebaseService = dataService;
