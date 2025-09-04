import { GenerateImageRequest, GeneratedImageResponse } from '../dtos';
import { IUserRepository, IImageRepository } from '../../domain/repositories';
import { ICreditCalculationService, IImageGenerationService, IWalletService } from '../../domain/services';

export class GenerateImageUseCase {
  constructor(
    private userRepository: IUserRepository,
    private imageRepository: IImageRepository,
    private creditService: ICreditCalculationService,
    private imageService: IImageGenerationService,
    private walletService: IWalletService
  ) {}

  async execute(userId: string, request: GenerateImageRequest): Promise<GeneratedImageResponse> {
    // Calculate credit cost
    const cost = this.creditService.calculateCost(
      request.resolution,
      request.generationType,
      request.productImages.length
    );

    // Check wallet balance
    const hasInsufficientBalance = await this.walletService.hasInsufficientBalance(
      userId,
      cost.rupees
    );

    if (hasInsufficientBalance) {
      throw new Error('Insufficient wallet balance');
    }

    // Enhance prompt
    const enhancedPrompt = this.imageService.enhancePrompt(
      request.prompt,
      request.generationType
    );

    // Generate image
    const imageUrl = await this.imageService.generateImage(enhancedPrompt, {
      resolution: request.resolution,
      generationType: request.generationType,
    });

    // Save image record
    const image = await this.imageRepository.create({
      userId,
      originalPrompt: request.prompt,
      enhancedPrompt,
      imageUrl,
      resolution: request.resolution,
      generationType: request.generationType,
      creditsUsed: cost.credits,
      status: 'completed',
    });

    // Deduct credits
    await this.walletService.deductCredits(
      userId,
      cost.rupees,
      `Image generation - ${request.resolution}`
    );

    return {
      id: image.id,
      imageUrl: image.imageUrl,
      creditsUsed: image.creditsUsed,
      enhancedPrompt: image.enhancedPrompt,
      status: image.status,
      createdAt: image.createdAt.toISOString(),
    };
  }
}