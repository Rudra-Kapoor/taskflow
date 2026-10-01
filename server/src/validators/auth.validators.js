import { z } from 'zod';
import { atLeastOneField, emailSchema, hexColor, stringField } from './common.js';

const nameSchema = stringField('Name')
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters');

const strongPassword = (label) =>
  stringField(label)
    .min(8, `${label} must be at least 8 characters`)
    .max(72, `${label} must be at most 72 characters`)
    .regex(/[a-z]/i, `${label} must contain at least one letter`)
    .regex(/\d/, `${label} must contain at least one number`);

export const registerSchema = {
  body: z.object({
    name: nameSchema,
    email: emailSchema,
    password: strongPassword('Password'),
  }),
};

export const loginSchema = {
  body: z.object({
    email: emailSchema,
    // Only presence is checked here: the strength rules must not leak through the login form.
    password: stringField('Password')
      .min(1, 'Password is required')
      .max(72, 'Password must be at most 72 characters'),
  }),
};

export const updateProfileSchema = {
  body: atLeastOneField(
    z.object({
      name: nameSchema.optional(),
      title: stringField('Title').trim().max(80, 'Title must be at most 80 characters').optional(),
      avatarColor: hexColor.optional(),
    }),
  ),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: stringField('Current password').min(1, 'Current password is required'),
      newPassword: strongPassword('New password'),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      path: ['newPassword'],
      message: 'New password must be different from the current password',
    }),
};
