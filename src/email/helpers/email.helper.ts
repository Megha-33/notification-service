
import * as ejs from 'ejs';
import * as path from 'path';

export async function renderTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<string> {
    const filePath = path.join(
      process.cwd(),
      'src',
      'email',
      'templates',
      `${templateName}.ejs`,
    );

    return ejs.renderFile(filePath, data);
  }