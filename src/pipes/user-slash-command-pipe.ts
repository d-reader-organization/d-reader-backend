import { ParamType, ReflectMetadataProvider } from '@discord-nestjs/core';
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import {
  Attachment,
  ChatInputCommandInteraction,
  Interaction,
  User,
} from 'discord.js';
type ExtendedType = unknown & {
  user: User;
  interaction: ChatInputCommandInteraction;
};

/**
 * Note: "user" is a reserved field and should not be manually added to your DTO.
 *
 * Extracts values from the interaction event and populates the DTO with those values.
 * Additionally, includes information about the user who initiated the slash command.
 */
@Injectable()
export class UserSlashCommandPipe implements PipeTransform {
  constructor(private readonly metadataProvider: ReflectMetadataProvider) {}

  transform(
    interaction: Interaction,
    metadata: ArgumentMetadata,
  ): InstanceType<any> {
    if (
      !metadata.metatype ||
      !this.metadataProvider.isDto(metadata.metatype) ||
      !interaction ||
      typeof interaction['isChatInputCommand'] !== 'function' ||
      !interaction.isChatInputCommand()
    )
      return interaction;

    const plainObject = {};
    const dtoInstance: ExtendedType = {
      ...new metadata.metatype(),
      user: undefined,
    };

    const allKeys = Object.keys(dtoInstance);
    const assignWithoutTransform: Record<string, any> = {};
    allKeys.forEach((property: string) => {
      const paramDecoratorMetadata =
        this.metadataProvider.getParamDecoratorMetadata(
          metadata.metatype,
          property,
        );

      if (property === 'user') {
        plainObject[property] = interaction.user;
      }
      if (!paramDecoratorMetadata) return;

      const { required, type } = paramDecoratorMetadata;
      const name = paramDecoratorMetadata.name ?? property;
      const interactionOption = interaction.options.get(name, required);
      plainObject[property] = interactionOption?.value ?? dtoInstance[property];

      if (type && type === ParamType.ATTACHMENT) {
        const propertyType = Reflect.getMetadata(
          'design:type',
          dtoInstance,
          property,
        );

        if (Object.is(propertyType, Attachment)) {
          assignWithoutTransform[property] =
            interactionOption?.attachment ?? dtoInstance[property];
        }
      }
    });
    plainObject['interaction'] = interaction;
    const resultDto = plainObject as ExtendedType;
    return Object.assign(resultDto, assignWithoutTransform);
  }
}
