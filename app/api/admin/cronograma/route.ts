import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simulação de banco de dados - em produção, usar um banco real
let cronogramas: any = {};

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Token inválido ou ausente' },
        { status: 401 }
      );
    }

    const { cronograma } = await request.json();

    if (!cronograma || !Array.isArray(cronograma)) {
      return NextResponse.json(
        { message: 'Dados do cronograma inválidos' },
        { status: 400 }
      );
    }

    // Salvar cronograma (em produção, salvar no banco de dados)
    const cronogramaId = Date.now().toString();
    cronogramas[cronogramaId] = {
      id: cronogramaId,
      cronograma,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      message: 'Cronograma salvo com sucesso',
      id: cronogramaId
    });

  } catch (error) {
    console.error('Erro ao salvar cronograma:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Token inválido ou ausente' },
        { status: 401 }
      );
    }

    // Retornar todos os cronogramas (em produção, filtrar por usuário/projeto)
    return NextResponse.json({
      cronogramas: Object.values(cronogramas)
    });

  } catch (error) {
    console.error('Erro ao buscar cronogramas:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Token inválido ou ausente' },
        { status: 401 }
      );
    }

    const { id, cronograma } = await request.json();

    if (!id || !cronograma || !Array.isArray(cronograma)) {
      return NextResponse.json(
        { message: 'ID ou dados do cronograma inválidos' },
        { status: 400 }
      );
    }

    if (!cronogramas[id]) {
      return NextResponse.json(
        { message: 'Cronograma não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar cronograma
    cronogramas[id] = {
      ...cronogramas[id],
      cronograma,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      message: 'Cronograma atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar cronograma:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Token inválido ou ausente' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'ID do cronograma é obrigatório' },
        { status: 400 }
      );
    }

    if (!cronogramas[id]) {
      return NextResponse.json(
        { message: 'Cronograma não encontrado' },
        { status: 404 }
      );
    }

    // Deletar cronograma
    delete cronogramas[id];

    return NextResponse.json({
      message: 'Cronograma deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar cronograma:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 