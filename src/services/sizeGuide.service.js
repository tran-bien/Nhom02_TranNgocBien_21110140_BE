const { Product } = require("@models");
const SizeGuide = require("../models/sizeGuide");
const ApiError = require("@utils/ApiError");
const paginate = require("@utils/pagination");

const sizeGuideService = {
  /**
   * [ADMIN] Lấy tất cả size guides
   */
  getAllSizeGuides: async (query = {}) => {
    const { page = 1, limit = 20, isActive } = query;

    const filter = {
      deletedAt: null,  
    };

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: { path: "product", select: "name slug" },
      sort: { createdAt: -1 },
    };

    return await paginate(SizeGuide, filter, options);
  },

  /**
   * [ADMIN] Lấy size guide theo ID
   */
  getSizeGuideById: async (guideId) => {
    const sizeGuide = await SizeGuide.findById(guideId).populate(
      "product",
      "name slug"
    );

    if (!sizeGuide) {
      throw new ApiError(404, "Không tìm thấy size guide");
    }

    return {
      success: true,
      sizeGuide,
    };
  },

  /**
   * [PUBLIC] Lấy size guide của sản phẩm
   */
  getProductSizeGuide: async (productId) => {
    const sizeGuide = await SizeGuide.findOne({
      product: productId,
      isActive: true,
    }).populate("product", "name slug");

    if (!sizeGuide) {
      return {
        success: true,
        sizeGuide: null,
        message: "Sản phẩm chưa có hướng dẫn size",
      };
    }

    return {
      success: true,
      sizeGuide,
    };
  },

  /**
   * [ADMIN] Tạo size guide cho sản phẩm
   * NOTE: Ảnh sẽ được upload sau qua updateSizeChartImage và updateMeasurementGuideImage
   */
  createSizeGuide: async (productId, guideData, adminId) => {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Kiểm tra đã có size guide chưa
    const existing = await SizeGuide.findOne({ product: productId });
    if (existing) {
      throw new ApiError(
        409,
        "Sản phẩm đã có size guide. Vui lòng cập nhật thay vì tạo mới"
      );
    }

    const sizeGuide = await SizeGuide.create({
      product: productId,
      sizeChart: {
        description: guideData.sizeChart?.description || "",
      },
      measurementGuide: {
        description: guideData.measurementGuide?.description || "",
      },
      isActive: guideData.isActive !== undefined ? guideData.isActive : true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    return {
      success: true,
      message:
        "Tạo size guide thành công. Vui lòng upload ảnh cho size chart và measurement guide",
      sizeGuide,
    };
  },

  /**
   * [ADMIN] Cập nhật size guide
   */
  updateSizeGuide: async (guideId, updateData, adminId) => {
    const sizeGuide = await SizeGuide.findById(guideId);

    if (!sizeGuide) {
      throw new ApiError(404, "Không tìm thấy size guide");
    }

    // Cập nhật các trường
    if (updateData.sizeChart) {
      sizeGuide.sizeChart = updateData.sizeChart;
    }

    if (updateData.measurementGuide) {
      sizeGuide.measurementGuide = updateData.measurementGuide;
    }

    if (updateData.isActive !== undefined) {
      sizeGuide.isActive = updateData.isActive;
    }

    sizeGuide.updatedBy = adminId;
    await sizeGuide.save();

    return {
      success: true,
      message: "Cập nhật size guide thành công",
      sizeGuide,
    };
  },

  /**
   * [ADMIN] Xóa size guide
   */
  deleteSizeGuide: async (guideId, adminId) => {
    const sizeGuide = await SizeGuide.findById(guideId);

    if (!sizeGuide) {
      throw new ApiError(404, "Không tìm thấy size guide");
    }

    // Xóa ảnh trên Cloudinary
    const cloudinary = require("@config/cloudinary");
    const imagesToDelete = [];

    if (sizeGuide.sizeChart?.image?.public_id) {
      imagesToDelete.push(sizeGuide.sizeChart.image.public_id);
    }

    if (sizeGuide.measurementGuide?.image?.public_id) {
      imagesToDelete.push(sizeGuide.measurementGuide.image.public_id);
    }

    if (imagesToDelete.length > 0) {
      try {
        await cloudinary.api.delete_resources(imagesToDelete);
      } catch (err) {
        console.error("Không thể xóa ảnh:", err);
      }
    }

    await sizeGuide.deleteOne();

    return {
      success: true,
      message: "Xóa size guide thành công",
    };
  },
};

module.exports = sizeGuideService;
