import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom class-validator decorator @IsHexColor() that accepts ONLY
 * #RRGGBB (6-digit hex, case-insensitive). Used by UpdateBrandingDto.
 *
 * NOTE: class-validator already ships @IsHexColor but it also accepts
 * #RGB (3-digit), which would break the hex→HSL converter (`hexToHslTriplet`
 * in @ecole-saas/shared) that requires 6 digits exactly.
 */
@ValidatorConstraint({ name: 'isHexColor6', async: false })
export class IsHexColorConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  }
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} doit être un hex #RRGGBB (ex: #4f46e5)`;
  }
}

export function IsHexColor(opts?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: opts,
      constraints: [],
      validator: IsHexColorConstraint,
    });
  };
}
