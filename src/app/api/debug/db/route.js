"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = void 0;
exports.dynamic = 'force-dynamic';
var api_utils_1 = require("@/lib/api-utils");
var db_1 = require("@/lib/db");
var mongoose_1 = require("mongoose");
var auth_utils_1 = require("@/lib/auth-utils");
/**
 * GET /api/debug/db
 * Test database connection with optional collection listing
 */
exports.GET = (0, auth_utils_1.withAuth)(function (req, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, url, showCollections, showStats, dbStatus, readyState, readyStateMap, collections, error_1, collections, collectionNames, stats, collectionsToCheck, _i, collectionsToCheck_1, name_1, collStats, statError_1, error_2, dbError_1, hrtime_1, responseTimeMs_1, hrtime, responseTimeMs, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 19, , 20]);
                startTime = process.hrtime();
                url = new URL(req.url);
                showCollections = url.searchParams.get('collections') === 'true';
                showStats = url.searchParams.get('stats') === 'true';
                dbStatus = {
                    connected: false,
                    readyState: 0,
                    readyStateText: 'disconnected',
                    host: null,
                    name: null,
                    responseTime: 0,
                    collections: null,
                    modelCount: 0,
                    models: null,
                    collectionStats: null
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 17, , 18]);
                // Connect to database
                return [4 /*yield*/, (0, db_1.dbConnect)()];
            case 2:
                // Connect to database
                _a.sent();
                readyState = mongoose_1.default.connection.readyState;
                readyStateMap = {
                    0: 'disconnected',
                    1: 'connected',
                    2: 'connecting',
                    3: 'disconnecting',
                    99: 'uninitialized'
                };
                // Update basic connection info
                dbStatus.connected = readyState === 1;
                dbStatus.readyState = readyState;
                dbStatus.readyStateText = readyStateMap[readyState] || 'unknown';
                dbStatus.host = mongoose_1.default.connection.host;
                dbStatus.name = mongoose_1.default.connection.name;
                dbStatus.modelCount = Object.keys(mongoose_1.default.models).length;
                if (!dbStatus.connected) return [3 /*break*/, 16];
                dbStatus.models = Object.keys(mongoose_1.default.models);
                if (!showCollections) return [3 /*break*/, 6];
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, mongoose_1.default.connection.db.listCollections().toArray()];
            case 4:
                collections = _a.sent();
                dbStatus.collections = collections.map(function (c) { return c.name || ''; }).filter(Boolean).sort();
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error('Error listing collections:', error_1);
                dbStatus.collections = { error: 'Failed to list collections' };
                return [3 /*break*/, 6];
            case 6:
                if (!showStats) return [3 /*break*/, 16];
                _a.label = 7;
            case 7:
                _a.trys.push([7, 15, , 16]);
                return [4 /*yield*/, mongoose_1.default.connection.db.listCollections().toArray()];
            case 8:
                collections = _a.sent();
                collectionNames = collections.map(function (c) { return c.name || ''; }).filter(Boolean);
                stats = {};
                collectionsToCheck = collectionNames.slice(0, 20);
                _i = 0, collectionsToCheck_1 = collectionsToCheck;
                _a.label = 9;
            case 9:
                if (!(_i < collectionsToCheck_1.length)) return [3 /*break*/, 14];
                name_1 = collectionsToCheck_1[_i];
                _a.label = 10;
            case 10:
                _a.trys.push([10, 12, , 13]);
                return [4 /*yield*/, mongoose_1.default.connection.db.collection(name_1).stats()];
            case 11:
                collStats = _a.sent();
                stats[name_1] = {
                    count: collStats.count || 0,
                    size: Math.round((collStats.size || 0) / 1024) + ' KB',
                    avgObjectSize: Math.round(collStats.avgObjSize || 0) + ' bytes',
                    storageSize: Math.round((collStats.storageSize || 0) / 1024) + ' KB',
                    indexes: collStats.nindexes || 0,
                };
                return [3 /*break*/, 13];
            case 12:
                statError_1 = _a.sent();
                console.error("Error getting stats for ".concat(name_1, ":"), statError_1);
                stats[name_1] = { error: 'Failed to get collection stats' };
                return [3 /*break*/, 13];
            case 13:
                _i++;
                return [3 /*break*/, 9];
            case 14:
                dbStatus.collectionStats = stats;
                return [3 /*break*/, 16];
            case 15:
                error_2 = _a.sent();
                console.error('Error getting collection stats:', error_2);
                dbStatus.collectionStats = { error: 'Failed to get collection statistics' };
                return [3 /*break*/, 16];
            case 16: return [3 /*break*/, 18];
            case 17:
                dbError_1 = _a.sent();
                console.error('Database connection error:', dbError_1);
                // Update status with error info
                dbStatus.connected = false;
                dbStatus.error = dbError_1.message || 'Database connection failed';
                hrtime_1 = process.hrtime(startTime);
                responseTimeMs_1 = Math.round((hrtime_1[0] * 1000) + (hrtime_1[1] / 1000000));
                dbStatus.responseTime = responseTimeMs_1;
                return [2 /*return*/, (0, api_utils_1.apiResponse)(dbStatus, false, 'Database connection error')];
            case 18:
                hrtime = process.hrtime(startTime);
                responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
                dbStatus.responseTime = responseTimeMs;
                // Return database status
                return [2 /*return*/, (0, api_utils_1.apiResponse)(dbStatus, dbStatus.connected, dbStatus.connected ? 'Database connected' : 'Database not connected')];
            case 19:
                error_3 = _a.sent();
                return [2 /*return*/, (0, api_utils_1.handleApiError)(error_3, "Error checking database connection")];
            case 20: return [2 /*return*/];
        }
    });
}); }, auth_utils_1.AuthLevel.DEV_OPTIONAL);
/**
 * POST /api/debug/db
 * Run database maintenance operations (admin only)
 */
var POST = function (req) { return __awaiter(void 0, void 0, void 0, function () {
    /**
     * Format bytes to human-readable format
     */
    function formatBytes(bytes, decimals) {
        if (decimals === void 0) { decimals = 2; }
        if (!bytes || isNaN(bytes) || bytes === 0)
            return '0 Bytes';
        var k = 1024;
        var dm = decimals < 0 ? 0 : decimals;
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, auth_utils_1.withRoleProtection)(['admin'])(req, function () { return __awaiter(void 0, void 0, void 0, function () {
                var body, error_4, operation, validOperations, result, stats, error_5, collections, validationResults, _i, collections_1, col, validation, error_6, error_7, cleanupResults, modelNames, _a, modelNames_1, modelName, model, collectionName, compactResult, compactError_1, modelError_1, error_8, error_9;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 37, , 38]);
                            return [4 /*yield*/, (0, db_1.dbConnect)()];
                        case 1:
                            _b.sent();
                            body = {};
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, req.json()];
                        case 3:
                            body = _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_4 = _b.sent();
                            return [3 /*break*/, 5];
                        case 5:
                            // Ensure body is an object
                            if (!body || typeof body !== 'object') {
                                body = {};
                            }
                            operation = body.operation || '';
                            validOperations = ['validate', 'repair', 'cleanup', 'vacuum', 'stats'];
                            if (dbConnectionFailed) {
                                return [2 /*return*/, (0, api_utils_1.apiError)('Database connection failed', 500, 'ERR_DB_CONNECTION')];
                            }
                            result = {
                                operation: operation,
                                success: false,
                                timestamp: new Date().toISOString(),
                                details: null
                            };
                            if (!(operation === 'stats')) return [3 /*break*/, 10];
                            _b.label = 6;
                        case 6:
                            _b.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, mongoose_1.default.connection.db.stats()];
                        case 7:
                            stats = _b.sent();
                            result.success = true;
                            result.details = {
                                database: stats.db,
                                collections: stats.collections,
                                views: stats.views,
                                objects: stats.objects,
                                dataSize: formatBytes(stats.dataSize),
                                storageSize: formatBytes(stats.storageSize),
                                indexes: stats.indexes,
                                indexSize: formatBytes(stats.indexSize),
                                avgObjSize: formatBytes(stats.avgObjSize),
                                fsTotalSize: stats.fsTotalSize ? formatBytes(stats.fsTotalSize) : 'N/A',
                                fsUsedSize: stats.fsUsedSize ? formatBytes(stats.fsUsedSize) : 'N/A'
                            };
                            return [3 /*break*/, 9];
                        case 8:
                            error_5 = _b.sent();
                            console.error('Error getting database stats:', error_5);
                            result.details = { error: 'Failed to get database statistics' };
                            return [3 /*break*/, 9];
                        case 9: return [3 /*break*/, 36];
                        case 10:
                            if (!(operation === 'validate')) return [3 /*break*/, 21];
                            _b.label = 11;
                        case 11:
                            _b.trys.push([11, 19, , 20]);
                            return [4 /*yield*/, mongoose_1.default.connection.db.listCollections().toArray()];
                        case 12:
                            collections = _b.sent();
                            validationResults = {};
                            _i = 0, collections_1 = collections;
                            _b.label = 13;
                        case 13:
                            if (!(_i < collections_1.length)) return [3 /*break*/, 18];
                            col = collections_1[_i];
                            _b.label = 14;
                        case 14:
                            _b.trys.push([14, 16, , 17]);
                            if (!col.name)
                                return [3 /*break*/, 17];
                            return [4 /*yield*/, mongoose_1.default.connection.db.command({
                                    validate: col.name,
                                    full: true
                                })];
                        case 15:
                            validation = _b.sent();
                            validationResults[col.name] = {
                                valid: validation.valid,
                                errors: validation.errors || [],
                                warning: validation.warning || null,
                                details: {
                                    keysPerIndex: validation.keysPerIndex,
                                    nInvalidDocuments: validation.nInvalidDocuments || 0,
                                    nrecords: validation.nrecords,
                                    datasize: formatBytes(validation.datasize || 0)
                                }
                            };
                            return [3 /*break*/, 17];
                        case 16:
                            error_6 = _b.sent();
                            if (col.name) {
                                validationResults[col.name] = {
                                    valid: false,
                                    error: error_6.message || 'Validation failed'
                                };
                            }
                            return [3 /*break*/, 17];
                        case 17:
                            _i++;
                            return [3 /*break*/, 13];
                        case 18:
                            result.success = true;
                            result.details = {
                                collectionsChecked: collections.length,
                                validationResults: validationResults
                            };
                            return [3 /*break*/, 20];
                        case 19:
                            error_7 = _b.sent();
                            console.error('Error validating database:', error_7);
                            result.details = { error: 'Database validation failed' };
                            return [3 /*break*/, 20];
                        case 20: return [3 /*break*/, 36];
                        case 21:
                            if (!(operation === 'repair')) return [3 /*break*/, 22];
                            return [2 /*return*/, (0, api_utils_1.apiError)('Database repair must be performed by database administrator', 400, 'ERR_OPERATION_NOT_SUPPORTED')];
                        case 22:
                            if (!(operation === 'cleanup')) return [3 /*break*/, 35];
                            _b.label = 23;
                        case 23:
                            _b.trys.push([23, 33, , 34]);
                            cleanupResults = {};
                            modelNames = Object.keys(mongoose_1.default.models);
                            _a = 0, modelNames_1 = modelNames;
                            _b.label = 24;
                        case 24:
                            if (!(_a < modelNames_1.length)) return [3 /*break*/, 32];
                            modelName = modelNames_1[_a];
                            _b.label = 25;
                        case 25:
                            _b.trys.push([25, 30, , 31]);
                            model = mongoose_1.default.models[modelName];
                            collectionName = model.collection.name;
                            _b.label = 26;
                        case 26:
                            _b.trys.push([26, 28, , 29]);
                            return [4 /*yield*/, mongoose_1.default.connection.db.command({
                                    compact: collectionName
                                })];
                        case 27:
                            compactResult = _b.sent();
                            cleanupResults[collectionName] = {
                                success: true,
                                details: compactResult
                            };
                            return [3 /*break*/, 29];
                        case 28:
                            compactError_1 = _b.sent();
                            console.error("Error compacting collection ".concat(collectionName, ":"), compactError_1);
                            cleanupResults[collectionName] = {
                                success: false,
                                error: compactError_1.message || 'Compact operation failed'
                            };
                            return [3 /*break*/, 29];
                        case 29: return [3 /*break*/, 31];
                        case 30:
                            modelError_1 = _b.sent();
                            console.error("Error processing model ".concat(modelName, ":"), modelError_1);
                            cleanupResults[modelName] = {
                                success: false,
                                error: modelError_1.message || 'Model processing failed'
                            };
                            return [3 /*break*/, 31];
                        case 31:
                            _a++;
                            return [3 /*break*/, 24];
                        case 32:
                            result.success = true;
                            result.details = {
                                modelsProcessed: modelNames.length,
                                cleanupResults: cleanupResults
                            };
                            return [3 /*break*/, 34];
                        case 33:
                            error_8 = _b.sent();
                            console.error('Error during cleanup operation:', error_8);
                            result.details = { error: 'Database cleanup failed' };
                            return [3 /*break*/, 34];
                        case 34: return [3 /*break*/, 36];
                        case 35:
                            if (operation === 'vacuum') {
                                return [2 /*return*/, (0, api_utils_1.apiError)('MongoDB does not support VACUUM operation. Use cleanup instead.', 400, 'ERR_OPERATION_NOT_SUPPORTED')];
                            }
                            _b.label = 36;
                        case 36: return [2 /*return*/, (0, api_utils_1.apiResponse)(dbStatus, true, dbStatus.connected ? 'Database connected' : 'Database not connected')];
                        case 37:
                            error_9 = _b.sent();
                            return [2 /*return*/, (0, api_utils_1.handleApiError)(error_9, "Error checking database connection")];
                        case 38: return [2 /*return*/];
                    }
                });
            }); }, auth_utils_1.AuthLevel.DEV_OPTIONAL)];
    });
}); };
exports.POST = POST;
