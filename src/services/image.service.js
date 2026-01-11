const cloudinary = require("@config/cloudinary");
const { Product, Variant, Brand, User, Banner } = require("@models");
const SizeGuide = require("../models/sizeGuide");
const ApiError = require("@utils/ApiError");

/**
 * Helper: Parse markdown content để tìm tất cả URL ảnh
 * Hỗ trợ cả markdown syntax và HTML img tag
 * @param {String} markdownContent - Nội dung markdown
 * @returns {Array} - Mảng các URL ảnh
 */
const extractMarkdownImageUrls = (markdownContent) => {
  if (!markdownContent) return [];

  const urls = [];

  // Regex tìm markdown images: ![alt](url)
  const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
  let match;
  while ((match = markdownImageRegex.exec(markdownContent)) !== null) {
    urls.push(match[1]);
  }

  // Regex tìm HTML img tags: <img src="url" />
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/g;
  while ((match = htmlImageRegex.exec(markdownContent)) !== null) {
    urls.push(match[1]);
  }

  return urls;
};

/**
 * Helper: Extract public_id từ Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String|null} - public_id hoặc null nếu không phải Cloudinary URL
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{ext}
  const regex = /\/upload\/(?:v\d+\/)?(.+)$/;
  const match = url.match(regex);

  if (match && match[1]) {
    // Remove file extension
    return match[1].replace(/\.[^.]+$/, "");
  }

  return null;
};

const imageService = {
  /**
   * Xóa một hoặc nhiều ảnh từ Cloudinary
   * @param {Array} publicIds - Mảng các public_id cần xóa
   * @returns {Promise<Array>} - Kết quả xóa
   */
  deleteImages: async (publicIds) => {
    if (!Array.isArray(publicIds)) {
      publicIds = [publicIds];
    }

    const deletePromises = publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId)
    );

    return await Promise.all(deletePromises);
  },

  /**
   * Cập nhật ảnh đại diện cho người dùng
   * @param {String} userId - ID người dùng
   * @param {Object} avatarData - Dữ liệu ảnh đại diện mới { url, public_id }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  updateUserAvatar: async (userId, avatarData) => {
    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Nếu người dùng đã có ảnh đại diện, xóa ảnh cũ
    if (user.avatar && user.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (err) {
        console.error("Không thể xóa ảnh đại diện cũ:", err);
        // Không throw lỗi này vì vẫn muốn tiếp tục cập nhật ảnh mới
      }
    }

    // Cập nhật ảnh đại diện mới
    user.avatar = {
      url: avatarData.url,
      public_id: avatarData.public_id,
    };

    await user.save();

    return {
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      avatar: user.avatar,
    };
  },

  /**
   * Xóa ảnh đại diện người dùng
   * @param {String} userId - ID người dùng
   * @returns {Promise<Object>} - Kết quả xóa
   */
  removeUserAvatar: async (userId) => {
    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Nếu người dùng có ảnh đại diện, xóa nó
    if (user.avatar && user.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (err) {
        console.error("Không thể xóa ảnh đại diện:", err);
        // Không throw lỗi này vì vẫn muốn tiếp tục reset thông tin avatar
      }
    }

    // Reset thông tin avatar
    user.avatar = {
      url: "",
      public_id: "",
    };

    await user.save();

    return {
      success: true,
      message: "Đã xóa ảnh đại diện",
    };
  },

  /**
   * Cập nhật logo cho brand
   * @param {String} brandId - ID brand
   * @param {Object} logoData - Dữ liệu logo mới { url, public_id }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  updateBrandLogo: async (brandId, logoData) => {
    // Tìm brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new ApiError(404, "Không tìm thấy thương hiệu");
    }

    // Nếu brand đã có logo, xóa logo cũ
    if (brand.logo && brand.logo.public_id) {
      try {
        await cloudinary.uploader.destroy(brand.logo.public_id);
      } catch (err) {
        console.error("Không thể xóa logo cũ:", err);
        // Không throw lỗi này vì vẫn muốn tiếp tục cập nhật logo mới
      }
    }

    // Cập nhật logo mới
    brand.logo = logoData;

    await brand.save();

    return {
      success: true,
      message: "Cập nhật logo thương hiệu thành công",
      logo: brand.logo,
    };
  },

  /**
   * Xóa logo của brand
   * @param {String} brandId - ID brand
   * @returns {Promise<Object>} - Kết quả xóa
   */
  removeBrandLogo: async (brandId) => {
    // Tìm brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new ApiError(404, "Không tìm thấy thương hiệu");
    }

    // Nếu brand có logo, xóa nó
    if (brand.logo && brand.logo.public_id) {
      try {
        await cloudinary.uploader.destroy(brand.logo.public_id);
      } catch (err) {
        console.error("Không thể xóa logo:", err);
        // Không throw lỗi này vì vẫn muốn tiếp tục reset thông tin logo
      }
    }

    // Reset thông tin logo
    brand.logo = {
      url: "",
      public_id: "",
    };

    await brand.save();

    return {
      success: true,
      message: "Đã xóa logo thương hiệu",
    };
  },

  /**
   * Thêm ảnh cho product
   * @param {String} productId - ID sản phẩm
   * @param {Array} images - Mảng các đối tượng ảnh
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  addProductImages: async (productId, images) => {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Tìm giá trị displayOrder lớn nhất trong mảng hiện tại
    let maxDisplayOrder = -1;
    if (product.images && product.images.length > 0) {
      maxDisplayOrder = Math.max(
        ...product.images.map((img) => img.displayOrder)
      );
    }

    // Cập nhật displayOrder cho các ảnh mới bắt đầu từ (maxDisplayOrder + 1)
    images.forEach((img, index) => {
      img.displayOrder = maxDisplayOrder + 1 + index;
    });

    // Nếu chưa có ảnh chính, đặt ảnh đầu tiên của ảnh mới làm ảnh chính
    const hasMainImage = product.images.some((img) => img.isMain);
    if (!hasMainImage && images.length > 0) {
      images[0].isMain = true;
    } else {
      // Đảm bảo các ảnh mới không được đánh dấu là ảnh chính nếu đã có ảnh chính
      images.forEach((img) => {
        img.isMain = false;
      });
    }

    // Thêm ảnh mới vào mảng ảnh hiện có
    product.images.push(...images);

    await product.save();

    return {
      success: true,
      message: "Thêm ảnh sản phẩm thành công",
      images: product.images,
    };
  },

  /**
   * Xóa ảnh của product
   * @param {String} productId - ID sản phẩm
   * @param {Array} imageIds - Mảng ID ảnh cần xóa
   * @returns {Promise<Object>} - Kết quả xóa
   */
  removeProductImages: async (productId, imageIds) => {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Lọc ra những ảnh cần xóa
    const imagesToDelete = product.images.filter((img) =>
      imageIds.includes(img._id.toString())
    );

    if (imagesToDelete.length === 0) {
      throw new ApiError(404, "Không tìm thấy ảnh cần xóa");
    }

    // Lấy public_id để xóa trên Cloudinary
    const publicIds = imagesToDelete.map((img) => img.public_id);

    // Xóa ảnh trên Cloudinary
    await imageService.deleteImages(publicIds);

    // Xóa ảnh khỏi model
    product.images = product.images.filter(
      (img) => !imageIds.includes(img._id.toString())
    );

    // Kiểm tra nếu đã xóa ảnh chính, đặt ảnh đầu tiên còn lại làm ảnh chính
    if (
      product.images.length > 0 &&
      !product.images.some((img) => img.isMain)
    ) {
      product.images[0].isMain = true;
    }

    // Đánh lại thứ tự hiển thị cho các ảnh còn lại
    product.images.sort((a, b) => a.displayOrder - b.displayOrder);
    product.images.forEach((img, index) => {
      img.displayOrder = index;
    });

    await product.save();

    return {
      success: true,
      message: "Xóa ảnh sản phẩm thành công",
      images: product.images,
    };
  },

  /**
   * Thêm ảnh cho variant
   * @param {String} variantId - ID biến thể
   * @param {Array} images - Mảng các đối tượng ảnh
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  addVariantImages: async (variantId, images) => {
    const variant = await Variant.findById(variantId);
    if (!variant) {
      throw new ApiError(404, "Không tìm thấy biến thể");
    }

    // Tìm giá trị displayOrder lớn nhất trong mảng hiện tại
    let maxDisplayOrder = -1;
    if (variant.imagesvariant && variant.imagesvariant.length > 0) {
      maxDisplayOrder = Math.max(
        ...variant.imagesvariant.map((img) => img.displayOrder)
      );
    }

    // Cập nhật displayOrder cho các ảnh mới bắt đầu từ (maxDisplayOrder + 1)
    images.forEach((img, index) => {
      img.displayOrder = maxDisplayOrder + 1 + index;
    });

    // Kiểm tra nếu ảnh đầu tiên có isMain và không có ảnh chính nào trước đó
    const hasMainImage = variant.imagesvariant.some((img) => img.isMain);
    if (!hasMainImage && images.length > 0) {
      images[0].isMain = true;
    } else {
      // Đảm bảo các ảnh mới không được đánh dấu là ảnh chính nếu đã có ảnh chính
      images.forEach((img) => {
        img.isMain = false;
      });
    }

    // Thêm ảnh mới vào mảng ảnh hiện có
    variant.imagesvariant.push(...images);

    await variant.save();

    return {
      success: true,
      message: "Thêm ảnh biến thể thành công",
      images: variant.imagesvariant,
    };
  },

  /**
   * Xóa ảnh của variant
   * @param {String} variantId - ID biến thể
   * @param {Array} imageIds - Mảng ID ảnh cần xóa
   * @returns {Promise<Object>} - Kết quả xóa
   */
  removeVariantImages: async (variantId, imageIds) => {
    const variant = await Variant.findById(variantId);
    if (!variant) {
      throw new ApiError(404, "Không tìm thấy biến thể");
    }

    // Lọc ra những ảnh cần xóa
    const imagesToDelete = variant.imagesvariant.filter((img) =>
      imageIds.includes(img._id.toString())
    );

    if (imagesToDelete.length === 0) {
      throw new ApiError(404, "Không tìm thấy ảnh cần xóa");
    }

    // Lấy public_id để xóa trên Cloudinary
    const publicIds = imagesToDelete.map((img) => img.public_id);

    // Xóa ảnh trên Cloudinary
    await imageService.deleteImages(publicIds);

    // Xóa ảnh khỏi model
    variant.imagesvariant = variant.imagesvariant.filter(
      (img) => !imageIds.includes(img._id.toString())
    );

    // Kiểm tra nếu đã xóa ảnh chính, đặt ảnh đầu tiên còn lại làm ảnh chính
    if (
      variant.imagesvariant.length > 0 &&
      !variant.imagesvariant.some((img) => img.isMain)
    ) {
      variant.imagesvariant[0].isMain = true;
    }

    // Đánh lại thứ tự hiển thị cho các ảnh còn lại
    variant.imagesvariant.sort((a, b) => a.displayOrder - b.displayOrder);
    variant.imagesvariant.forEach((img, index) => {
      img.displayOrder = index;
    });

    await variant.save();

    return {
      success: true,
      message: "Xóa ảnh biến thể thành công",
      images: variant.imagesvariant,
    };
  },

  /**
   * Sắp xếp ảnh của product
   * @param {String} productId - ID sản phẩm
   * @param {Array} imageOrders - Mảng { _id, displayOrder }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  reorderProductImages: async (productId, imageOrders) => {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Cập nhật thứ tự
    imageOrders.forEach((order) => {
      const image = product.images.id(order._id);
      if (image) {
        image.displayOrder = order.displayOrder;
      }
    });

    // Sắp xếp lại mảng
    product.images.sort((a, b) => a.displayOrder - b.displayOrder);

    await product.save();

    return {
      success: true,
      message: "Cập nhật thứ tự ảnh sản phẩm thành công",
      images: product.images,
    };
  },

  /**
   * Sắp xếp ảnh của variant
   * @param {String} variantId - ID biến thể
   * @param {Array} imageOrders - Mảng { _id, displayOrder }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  reorderVariantImages: async (variantId, imageOrders) => {
    const variant = await Variant.findById(variantId);
    if (!variant) {
      throw new ApiError(404, "Không tìm thấy biến thể");
    }

    // Cập nhật thứ tự
    imageOrders.forEach((order) => {
      const image = variant.imagesvariant.id(order._id);
      if (image) {
        image.displayOrder = order.displayOrder;
      }
    });

    // Sắp xếp lại mảng
    variant.imagesvariant.sort((a, b) => a.displayOrder - b.displayOrder);

    await variant.save();

    return {
      success: true,
      message: "Cập nhật thứ tự ảnh biến thể thành công",
      images: variant.imagesvariant,
    };
  },

  /**
   * Đặt ảnh chính cho product
   * @param {String} productId - ID sản phẩm
   * @param {String} imageId - ID ảnh cần đặt làm ảnh chính
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  setProductMainImage: async (productId, imageId) => {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Không tìm thấy sản phẩm");
    }

    // Bỏ đánh dấu ảnh chính cũ
    product.images.forEach((image) => {
      image.isMain = false;
    });

    // Đánh dấu ảnh mới làm ảnh chính
    const mainImage = product.images.id(imageId);
    if (!mainImage) {
      throw new ApiError(404, "Không tìm thấy ảnh cần đặt làm ảnh chính");
    }

    mainImage.isMain = true;

    await product.save();

    return {
      success: true,
      message: "Đã cập nhật ảnh chính sản phẩm",
      images: product.images,
    };
  },

  /**
   * Đặt ảnh chính cho variant
   * @param {String} variantId - ID biến thể
   * @param {String} imageId - ID ảnh cần đặt làm ảnh chính
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  setVariantMainImage: async (variantId, imageId) => {
    const variant = await Variant.findById(variantId);
    if (!variant) {
      throw new ApiError(404, "Không tìm thấy biến thể");
    }

    // Bỏ đánh dấu ảnh chính cũ
    variant.imagesvariant.forEach((image) => {
      image.isMain = false;
    });

    // Đánh dấu ảnh mới làm ảnh chính
    const mainImage = variant.imagesvariant.id(imageId);
    if (!mainImage) {
      throw new ApiError(404, "Không tìm thấy ảnh cần đặt làm ảnh chính");
    }

    mainImage.isMain = true;

    await variant.save();

    return {
      success: true,
      message: "Đã cập nhật ảnh chính biến thể",
      images: variant.imagesvariant,
    };
  },

  // ======================== BANNER IMAGE OPERATIONS ========================

  /**
   * Upload ảnh banner mới
   * @param {Object} imageData - Dữ liệu ảnh { url, public_id }
   * @param {Object} bannerData - Dữ liệu banner { title, displayOrder, link, isActive }
   * @returns {Promise<Object>} - Banner mới được tạo
   */
  uploadBannerImage: async (imageData, bannerData) => {
    const { Banner } = require("@models");

    // Kiểm tra xem vị trí đã được sử dụng chưa
    const existingBanner = await Banner.findOne({
      displayOrder: bannerData.displayOrder,
      isActive: true,
      deletedAt: null,
    });

    if (existingBanner) {
      throw new ApiError(
        409,
        `Vị trí ${bannerData.displayOrder} đã được sử dụng`
      );
    }

    // Tạo banner mới
    const banner = new Banner({
      title: bannerData.title,
      image: {
        url: imageData.url,
        public_id: imageData.public_id,
      },
      displayOrder: bannerData.displayOrder,
      isActive: bannerData.isActive !== undefined ? bannerData.isActive : true,
      link: bannerData.link || "",
    });

    await banner.save();

    return {
      success: true,
      message: "Upload ảnh banner thành công",
      banner,
    };
  },

  /**
   * Cập nhật ảnh banner
   * @param {String} bannerId - ID banner
   * @param {Object} imageData - Dữ liệu ảnh mới { url, public_id }
   * @returns {Promise<Object>} - Banner đã cập nhật
   */
  updateBannerImage: async (bannerId, imageData) => {
    const { Banner } = require("@models");

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(404, "Không tìm thấy banner");
    }

    // Xóa ảnh cũ từ Cloudinary
    if (banner.image && banner.image.public_id) {
      try {
        await cloudinary.uploader.destroy(banner.image.public_id);
      } catch (err) {
        console.error("Không thể xóa ảnh banner cũ:", err);
      }
    }

    // Cập nhật ảnh mới
    banner.image = {
      url: imageData.url,
      public_id: imageData.public_id,
    };

    await banner.save();

    return {
      success: true,
      message: "Cập nhật ảnh banner thành công",
      banner,
    };
  },

  /**
   * Xóa banner và ảnh của nó
   * @param {String} bannerId - ID banner
   * @param {String} userId - ID người xóa
   * @returns {Promise<Object>} - Kết quả xóa
   */
  deleteBannerImage: async (bannerId, userId) => {
    const { Banner } = require("@models");

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(404, "Không tìm thấy banner");
    }

    const displayOrder = banner.displayOrder;

    // Xóa ảnh từ Cloudinary
    if (banner.image && banner.image.public_id) {
      try {
        await cloudinary.uploader.destroy(banner.image.public_id);
      } catch (err) {
        console.error("Không thể xóa ảnh banner từ Cloudinary:", err);
      }
    }

    // Xóa mềm banner
    banner.deletedAt = new Date();
    banner.deletedBy = userId;
    banner.isActive = false;
    await banner.save();

    // Điều chỉnh displayOrder của các banner khác
    await Banner.updateMany(
      {
        displayOrder: { $gt: displayOrder },
        isActive: true,
        deletedAt: null,
      },
      { $inc: { displayOrder: -1 } }
    );

    return {
      success: true,
      message: "Xóa banner thành công",
    };
  },

  /**
   * Cập nhật ảnh size chart cho size guide
   * @param {String} sizeGuideId - ID size guide
   * @param {Object} imageData - Dữ liệu ảnh mới { url, public_id }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  updateSizeChartImage: async (sizeGuideId, imageData) => {
    const sizeGuide = await SizeGuide.findById(sizeGuideId);
    if (!sizeGuide) {
      throw new ApiError(404, "Không tìm thấy size guide");
    }

    // Xóa ảnh cũ trên Cloudinary nếu có
    if (sizeGuide.sizeChart?.image?.public_id) {
      try {
        await cloudinary.uploader.destroy(sizeGuide.sizeChart.image.public_id);
      } catch (err) {
        console.error("Không thể xóa ảnh size chart cũ:", err);
      }
    }

    // Cập nhật ảnh mới
    sizeGuide.sizeChart.image = {
      url: imageData.url,
      public_id: imageData.public_id,
    };

    await sizeGuide.save();

    return {
      success: true,
      message: "Cập nhật ảnh size chart thành công",
      sizeGuide,
    };
  },

  /**
   * Cập nhật ảnh measurement guide cho size guide
   * @param {String} sizeGuideId - ID size guide
   * @param {Object} imageData - Dữ liệu ảnh mới { url, public_id }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  updateMeasurementGuideImage: async (sizeGuideId, imageData) => {
    const sizeGuide = await SizeGuide.findById(sizeGuideId);
    if (!sizeGuide) {
      throw new ApiError(404, "Không tìm thấy size guide");
    }

    // Xóa ảnh cũ trên Cloudinary nếu có
    if (sizeGuide.measurementGuide?.image?.public_id) {
      try {
        await cloudinary.uploader.destroy(
          sizeGuide.measurementGuide.image.public_id
        );
      } catch (err) {
        console.error("Không thể xóa ảnh measurement guide cũ:", err);
      }
    }

    // Cập nhật ảnh mới
    sizeGuide.measurementGuide.image = {
      url: imageData.url,
      public_id: imageData.public_id,
    };

    await sizeGuide.save();

    return {
      success: true,
      message: "Cập nhật ảnh hướng dẫn đo chân thành công",
      sizeGuide,
    };
  },

  // ======================== BLOG IMAGE OPERATIONS ========================

  /**
   * Upload ảnh cho blog content (dùng trong markdown editor)
   *
   * NOTE FOR FRONTEND:
   * - Endpoint: POST /api/admin/images/blog-content
   * - Use case: Chèn ảnh vào markdown content khi viết blog
   * - Frontend implementation:
   *   + Option A: Markdown Editor với toolbar button (react-markdown-editor-lite, SimpleMDE)
   *   + Option B: Drag & Drop + Paste (Ctrl+V) ảnh từ clipboard
   *   + Recommend: Kết hợp cả 2 (Editor có onImageUpload callback)
   *
   * - Upload flow:
   *   1. User click button "Insert Image" hoặc Ctrl+V paste ảnh
   *   2. Frontend gọi API này với FormData { image: file }
   *   3. Backend upload lên Cloudinary folder: blogs/content
   *   4. Backend trả về: { url, public_id }
   *   5. Frontend tự động chèn markdown: ![](url) vào editor
   *
   * - Example Frontend (react-markdown-editor-lite):
   *   ```jsx
   *   import MdEditor from 'react-markdown-editor-lite';
   *
   *   const handleImageUpload = async (file) => {
   *     const formData = new FormData();
   *     formData.append('image', file);
   *     const res = await axios.post('/api/admin/images/blog-content', formData);
   *     return res.data.url; // Editor sẽ tự chèn ![](url)
   *   };
   *
   *   <MdEditor onImageUpload={handleImageUpload} />
   *   ```
   *
   * - Cleanup: Khi xóa blog post, API sẽ tự động parse markdown content,
   *   tìm tất cả ảnh Cloudinary và xóa chúng (xem blog.service.js deletePost)
   *
   * @param {Object} imageData - Dữ liệu ảnh từ multer { url, public_id }
   * @returns {Promise<Object>} - URL và public_id của ảnh đã upload
   */
  uploadBlogContentImage: async (imageData) => {
    if (!imageData || !imageData.url || !imageData.public_id) {
      throw new ApiError(400, "Dữ liệu ảnh không hợp lệ");
    }

    return {
      success: true,
      message: "Upload ảnh blog content thành công",
      url: imageData.url,
      public_id: imageData.public_id,
    };
  },

  /**
   * Xóa tất cả ảnh trong markdown content của blog post
   * Được gọi tự động khi xóa blog post
   *
   * @param {String} markdownContent - Nội dung markdown của blog
   * @returns {Promise<Object>} - Kết quả xóa ảnh
   */
  deleteBlogContentImages: async (markdownContent) => {
    if (!markdownContent) {
      return {
        success: true,
        message: "Không có ảnh để xóa",
        deletedCount: 0,
      };
    }

    // Extract tất cả URL ảnh từ markdown
    const imageUrls = extractMarkdownImageUrls(markdownContent);

    if (imageUrls.length === 0) {
      return {
        success: true,
        message: "Không có ảnh Cloudinary trong content",
        deletedCount: 0,
      };
    }

    // Filter chỉ lấy Cloudinary URLs và extract public_id
    const publicIds = imageUrls
      .map((url) => extractPublicIdFromUrl(url))
      .filter((id) => id !== null);

    if (publicIds.length === 0) {
      return {
        success: true,
        message: "Không có ảnh Cloudinary để xóa",
        deletedCount: 0,
      };
    }

    // Xóa ảnh từ Cloudinary
    try {
      const deleteResults = await Promise.all(
        publicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
      );

      const successCount = deleteResults.filter(
        (result) => result.result === "ok"
      ).length;

      return {
        success: true,
        message: `Đã xóa ${successCount}/${publicIds.length} ảnh từ Cloudinary`,
        deletedCount: successCount,
        totalFound: publicIds.length,
      };
    } catch (err) {
      console.error("Lỗi khi xóa ảnh blog content:", err);
      throw new ApiError(500, "Không thể xóa ảnh từ Cloudinary");
    }
  },

  // ======================== BLOG IMAGE OPERATIONS ========================

  /**
   * Upload/cập nhật ảnh thumbnail cho blog post
   * @param {String} postId - ID blog post
   * @param {Object} imageData - Dữ liệu ảnh { url, public_id }
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  updateBlogThumbnail: async (postId, imageData) => {
    const BlogPost = require("../models/blogPost");

    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Xóa ảnh thumbnail cũ trên Cloudinary nếu có
    if (post.thumbnail?.public_id) {
      try {
        await cloudinary.uploader.destroy(post.thumbnail.public_id);
      } catch (err) {
        console.error("Không thể xóa thumbnail cũ:", err);
      }
    }

    // Cập nhật thumbnail mới
    post.thumbnail = {
      url: imageData.url,
      public_id: imageData.public_id,
    };

    await post.save();

    return {
      success: true,
      message: "Cập nhật ảnh thumbnail thành công",
      thumbnail: post.thumbnail,
    };
  },

  /**
   * Upload/cập nhật ảnh featured image cho blog post
   * @param {String} postId - ID blog post
   * @param {Object} imageData - Dữ liệu ảnh { url, public_id }
   * @param {String} caption - Caption cho ảnh
   * @param {String} alt - Alt text cho ảnh
   * @returns {Promise<Object>} - Kết quả cập nhật
   */
  updateBlogFeaturedImage: async (postId, imageData, caption, alt) => {
    const BlogPost = require("../models/blogPost");

    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Xóa ảnh featured image cũ trên Cloudinary nếu có
    if (post.featuredImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(post.featuredImage.public_id);
      } catch (err) {
        console.error("Không thể xóa featured image cũ:", err);
      }
    }

    // Cập nhật featured image mới
    post.featuredImage = {
      url: imageData.url,
      public_id: imageData.public_id,
      caption: caption || "",
      alt: alt || "",
    };

    await post.save();

    return {
      success: true,
      message: "Cập nhật ảnh featured image thành công",
      featuredImage: post.featuredImage,
    };
  },

  /**
   * Xóa ảnh thumbnail của blog post
   * @param {String} postId - ID blog post
   * @returns {Promise<Object>} - Kết quả xóa
   */
  removeBlogThumbnail: async (postId) => {
    const BlogPost = require("../models/blogPost");

    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    if (!post.thumbnail?.public_id) {
      throw new ApiError(404, "Bài viết chưa có ảnh thumbnail");
    }

    // Xóa ảnh trên Cloudinary
    try {
      await cloudinary.uploader.destroy(post.thumbnail.public_id);
    } catch (err) {
      console.error("Không thể xóa thumbnail:", err);
    }

    // Xóa thông tin thumbnail
    post.thumbnail = {
      url: "",
      public_id: "",
    };

    await post.save();

    return {
      success: true,
      message: "Đã xóa ảnh thumbnail",
    };
  },

  /**
   * Xóa ảnh featured image của blog post
   * @param {String} postId - ID blog post
   * @returns {Promise<Object>} - Kết quả xóa
   */
  removeBlogFeaturedImage: async (postId) => {
    const BlogPost = require("../models/blogPost");

    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    if (!post.featuredImage?.public_id) {
      throw new ApiError(404, "Bài viết chưa có ảnh featured image");
    }

    // Xóa ảnh trên Cloudinary
    try {
      await cloudinary.uploader.destroy(post.featuredImage.public_id);
    } catch (err) {
      console.error("Không thể xóa featured image:", err);
    }

    // Xóa thông tin featured image
    post.featuredImage = {
      url: "",
      public_id: "",
      caption: "",
      alt: "",
    };

    await post.save();

    return {
      success: true,
      message: "Đã xóa ảnh featured image",
    };
  },

  /**
   * Upload multiple images for return request reason
   * @param {Array} imageBuffers - Array of file buffers from multer
   * @returns {Promise<Array>} - Array of uploaded image objects { url, public_id }
   */
  uploadReturnReasonImages: async (imageBuffers) => {
    if (!imageBuffers || imageBuffers.length === 0) {
      throw new ApiError(400, "Vui lòng tải lên ít nhất 1 ảnh minh chứng");
    }

    if (imageBuffers.length > 5) {
      throw new ApiError(400, "Chỉ được tải lên tối đa 5 ảnh");
    }

    const cloudinary = require("@config/cloudinary");
    const { Readable } = require("stream");

    // Upload all images to Cloudinary
    const uploadPromises = imageBuffers.map((file) => {
      return new Promise((resolve, reject) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const nameWithoutExt =
          file.originalname.substring(0, file.originalname.lastIndexOf(".")) ||
          file.originalname;
        const filename = nameWithoutExt
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-_]/g, "")
          .substring(0, 100);
        const public_id = filename
          ? `${filename}-${uniqueSuffix}`
          : `return-reason-${uniqueSuffix}`;

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "returns/reasons",
            public_id: public_id,
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            transformation: [{ quality: "auto", width: 1200, crop: "limit" }],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
              });
            }
          }
        );

        const readableStream = Readable.from(file.buffer);
        readableStream.pipe(uploadStream);
      });
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);
      return uploadedImages;
    } catch (error) {
      console.error("Error uploading return reason images:", error);
      throw new ApiError(500, "Không thể tải ảnh lên. Vui lòng thử lại");
    }
  },

  /**
   * Delete return reason images from Cloudinary
   * @param {Array} images - Array of image objects { url, public_id }
   * @returns {Promise<void>}
   */
  deleteReturnReasonImages: async (images) => {
    if (!images || images.length === 0) return;

    const cloudinary = require("@config/cloudinary");
    const deletePromises = images.map((image) =>
      cloudinary.uploader.destroy(image.public_id).catch((err) => {
        console.error(`Failed to delete image ${image.public_id}:`, err);
      })
    );

    await Promise.all(deletePromises);
  },
};

module.exports = imageService;
