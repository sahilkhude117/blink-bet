/**
 * Users API Route - Create a new user
 * POST /api/users
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { externalId, username, email } = body;

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: 'externalId is required',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { externalId },
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        data: {
          userId: existingUser.id,
          externalId: existingUser.externalId,
          message: 'User already exists',
        },
      });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        externalId,
        username,
        email,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        externalId: user.externalId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        message: 'User created successfully',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create user',
      },
      { status: 500 }
    );
  }
}
