import { Injectable } from '@angular/core';
import { Variable, VariableTemplate } from 'src/app/classes/interfaces';
import { chronoTemplate } from './templates/chrono.template';

const TEMPLATE_METADATA_KEYS = new Set(['templateId', 'templateName', 'templateDescription']);

@Injectable({
  providedIn: 'root'
})
export class TemplateService {

  private readonly templates: VariableTemplate[] = [
    chronoTemplate,
  ];

  getTemplates(): VariableTemplate[] {
    return this.templates;
  }

  getApplicableTemplates(_variable: Variable): VariableTemplate[] {
    return this.templates;
  }

  applyTemplate(variable: Variable, templateId: string): void {
    const template = this.templates.find(item => item.templateId === templateId);
    if (!template) {
      return;
    }

    for (const key of Object.keys(template) as (keyof VariableTemplate)[]) {
      if (TEMPLATE_METADATA_KEYS.has(key)) {
        continue;
      }

      const value = template[key];
      if (value === undefined) {
        continue;
      }

      (variable as unknown as Record<string, unknown>)[key] = structuredClone(value);
    }
  }
}
