import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { config } from '../../config/index.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const meta = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await AuthService.login(email, password, meta);

      // Set rotated HttpOnly refresh cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return ApiResponse.success(
        res,
        {
          accessToken: result.accessToken,
          user: result.user,
        },
        'Logged in successfully'
      );
    } catch (error) {
      return next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const meta = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await AuthService.refreshTokens(rawRefreshToken, meta);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return ApiResponse.success(
        res,
        {
          accessToken: result.accessToken,
          user: result.user,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      return next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken = req.cookies?.refreshToken;
      await AuthService.logout(rawRefreshToken);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
      });

      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getMe(req.user!.id);
      return ApiResponse.success(res, user);
    } catch (error) {
      return next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user!.id, currentPassword, newPassword);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
      });

      return ApiResponse.success(res, null, 'Password changed successfully. Please log in again.');
    } catch (error) {
      return next(error);
    }
  }
}
