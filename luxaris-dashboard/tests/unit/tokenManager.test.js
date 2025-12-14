import { describe, it, expect } from 'vitest';
import * as TokenManager from '@/core/auth/tokenManager';

describe('TokenManager', () => {
    
    it('should validate JWT token format correctly', () => {
        const validToken = 'header.payload.signature';
        const invalidToken = 'invalid-token';

        expect(TokenManager.isValidTokenFormat(validToken)).toBe(true);
        expect(TokenManager.isValidTokenFormat(invalidToken)).toBe(false);
    });

    it('should store and retrieve tokens', () => {
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
        TokenManager.setToken(testToken);
        expect(TokenManager.getToken()).toBe(testToken);
    
        TokenManager.clearTokens();
        expect(TokenManager.getToken()).toBeNull();
    });

    it('should handle token expiration check', () => {
    // Token that expired in the past
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.signature';
    
        // Token that expires in the future (year 2099)
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQxMDI0NDQ4MDB9.signature';
    
        expect(TokenManager.isTokenExpired(expiredToken)).toBe(true);
        expect(TokenManager.isTokenExpired(validToken)).toBe(false);
    });
});
