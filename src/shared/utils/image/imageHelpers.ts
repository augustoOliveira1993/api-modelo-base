import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import uploadConfig from '@configs/storage/upload.config';

/**
 * Salva uma imagem convertendo-a para .webp no diretório de destino.
 *
 * @param sourcePath  Caminho absoluto do arquivo temporário (vindo do multer, por exemplo)
 * @param destDir     Caminho relativo ao `uploadConfig.directory` onde o arquivo será salvo
 *                    Exemplo: "uploads/logos/loja_123"
 * @param baseName    Nome base do arquivo (sem extensão). Se omitido, gera um UUID.
 * @returns           Caminho relativo salvo (ex: "uploads/logos/loja_123/uuid.webp")
 */
export async function saveImageAsWebp(
  sourcePath: string,
  destDir: string,
  baseName?: string,
): Promise<string> {
  const absoluteDestDir = path.resolve(uploadConfig.directory, destDir);

  if (!fs.existsSync(absoluteDestDir)) {
    fs.mkdirSync(absoluteDestDir, { recursive: true });
  }

  const fileName = `${baseName ?? uuidv4()}.webp`;
  const absoluteDestPath = path.resolve(absoluteDestDir, fileName);

  // Lê para buffer antes de converter: garante que o file handle do multer seja
  // liberado antes de qualquer operação no arquivo (evita EPERM no Windows)
  const sourceBuffer = fs.readFileSync(sourcePath);
  const webpBuffer = await sharp(sourceBuffer).webp({ quality: 85 }).toBuffer();

  // Escreve o conteúdo webp no próprio arquivo temporário e depois o move para
  // o destino final usando renameSync (mais confiável que unlink no Windows)
  fs.writeFileSync(sourcePath, webpBuffer);
  fs.renameSync(sourcePath, absoluteDestPath);

  // Retorna o caminho relativo com barras normais (compatível com URL da rota /files)
  return `${destDir.replace(/\\/g, '/')}/${fileName}`;
}

/**
 * Salva um arquivo convertendo-o para .webp no diretório de destino.
 *
 * @param sourcePath   Caminho absoluto do arquivo temporário
 * @param destDir      Caminho relativo ao `uploadConfig.directory` onde o arquivo será salvo
 * @param customName   Nome personalizado (sem extensão). Se omitido, gera `{originalName}-{uuid}` ou apenas `{uuid}`
 * @param originalName Nome original do arquivo (sem extensão) usado na geração automática do nome
 * @returns            Caminho relativo salvo (ex: "uploads/logos/loja_123/nome-uuid.webp")
 */
export async function saveFileAsWebp(
  sourcePath: string,
  destDir: string,
  customName?: string,
  originalName?: string,
): Promise<string> {
  const absoluteSourcePath = path.isAbsolute(sourcePath)
    ? sourcePath
    : path.resolve(uploadConfig.directory, sourcePath);

  const absoluteDestDir = path.resolve(uploadConfig.directory, destDir);

  if (!fs.existsSync(absoluteDestDir)) {
    fs.mkdirSync(absoluteDestDir, { recursive: true });
  }

  let baseName: string;
  if (customName) {
    baseName = customName;
  } else if (originalName) {
    const sanitized = originalName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    baseName = `${sanitized}-${uuidv4()}`;
  } else {
    baseName = uuidv4();
  }

  const fileName = `${baseName}.webp`;
  const absoluteDestPath = path.resolve(absoluteDestDir, fileName);

  const sourceBuffer = fs.readFileSync(absoluteSourcePath);
  const webpBuffer = await sharp(sourceBuffer).webp({ quality: 85 }).toBuffer();

  fs.writeFileSync(absoluteSourcePath, webpBuffer);
  fs.renameSync(absoluteSourcePath, absoluteDestPath);

  return `${destDir.replace(/\\/g, '/')}/${fileName}`;
}

/**
 * Deleta uma imagem do disco.
 *
 * @param filePath Caminho absoluto ou relativo ao `uploadConfig.directory`
 */
export function deleteImage(filePath: string): void {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(uploadConfig.directory, filePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}
