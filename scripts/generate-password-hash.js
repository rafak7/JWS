const bcrypt = require('bcryptjs');

// Função para gerar hash de senha
function generatePasswordHash(password) {
  const saltRounds = 12;
  const hash = bcrypt.hashSync(password, saltRounds);
  return hash;
}

// Verificar se foi passada uma senha como argumento
const password = process.argv[2];

if (!password) {
  console.log('❌ Erro: Forneça uma senha como argumento');
  console.log('📝 Uso: node scripts/generate-password-hash.js "sua-senha"');
  console.log('📝 Exemplo: node scripts/generate-password-hash.js "admin123"');
  process.exit(1);
}

console.log('🔐 Gerando hash para a senha...');
console.log('');

const hash = generatePasswordHash(password);

console.log('✅ Hash gerado com sucesso!');
console.log('');
console.log('📋 Senha original:', password);
console.log('🔒 Hash gerado:', hash);
console.log('');
console.log('💡 Use este hash no arquivo de configuração da API:');
console.log(`   password: '${hash}'`);
console.log('');
console.log('⚠️  IMPORTANTE: Mantenha este hash seguro e nunca compartilhe a senha original!');

// Verificar se o hash funciona
const isValid = bcrypt.compareSync(password, hash);
console.log('');
console.log('✅ Verificação do hash:', isValid ? 'SUCESSO' : 'FALHOU'); 