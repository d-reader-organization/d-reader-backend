import { BadRequestException } from "@nestjs/common";

export function validateWheelDate(startsAt:Date,expiresAt?:Date){
    if(!expiresAt)return;
    if(startsAt >= expiresAt){
        throw new BadRequestException("expiry date cannot be earlier than start date")
    }
}