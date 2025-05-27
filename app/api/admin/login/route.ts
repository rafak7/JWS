import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Credenciais do admin (em produção, isso deveria estar em um banco de dados)
const ADMIN_CREDENTIALS = {
  email: 'admin@jws.com',
  password: '$2b$12$Jeq7PIUlRtO7OOTz85PpH.KmjYIHEkjePDNjt/Ms6Vj.UA0q6NDHC', // senha: admin123
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Verificar se as credenciais foram fornecidas
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar email
    if (email !== ADMIN_CREDENTIALS.email) {
      return NextResponse.json(
        { message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      { email: email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json(
      { 
        message: 'Login realizado com sucesso',
        token: token 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 