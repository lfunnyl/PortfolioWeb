"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsNer = exports.newsAiSummary = exports.newsGet = exports.priceForecast = exports.priceSignals = exports.priceChart = exports.priceHistorical = exports.pricesBulk = void 0;
/**
 * Firebase Cloud Functions — Ana giriş noktası
 * Tüm HTTP endpoint'leri buradan export edilir.
 */
const admin = __importStar(require("firebase-admin"));
const prices_1 = require("./prices");
Object.defineProperty(exports, "pricesBulk", { enumerable: true, get: function () { return prices_1.pricesBulk; } });
Object.defineProperty(exports, "priceHistorical", { enumerable: true, get: function () { return prices_1.priceHistorical; } });
Object.defineProperty(exports, "priceChart", { enumerable: true, get: function () { return prices_1.priceChart; } });
Object.defineProperty(exports, "priceSignals", { enumerable: true, get: function () { return prices_1.priceSignals; } });
Object.defineProperty(exports, "priceForecast", { enumerable: true, get: function () { return prices_1.priceForecast; } });
const news_1 = require("./news");
Object.defineProperty(exports, "newsGet", { enumerable: true, get: function () { return news_1.newsGet; } });
Object.defineProperty(exports, "newsAiSummary", { enumerable: true, get: function () { return news_1.newsAiSummary; } });
Object.defineProperty(exports, "newsNer", { enumerable: true, get: function () { return news_1.newsNer; } });
admin.initializeApp();
//# sourceMappingURL=index.js.map