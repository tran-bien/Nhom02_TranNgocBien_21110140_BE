const BlogPost = require("../models/blogPost");
const BlogCategory = require("../models/blogCategory");
const { createSlug } = require("@utils/slugify");
const paginate = require("@utils/pagination");
const ApiError = require("@utils/ApiError");

const blogService = {
  /**
   * [ADMIN] Lấy danh sách blog posts (tất cả trạng thái)
   */
  getAdminPosts: async (query = {}) => {
    const { page = 1, limit = 10, category, tag, search, status } = query;

    const filter = {
      deletedAt: null,
    };

    if (category) {
      filter.category = category;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: "category", select: "name slug" },
        { path: "author", select: "name avatar" },
      ],
    };

    return await paginate(BlogPost, filter, options);
  },

  /**
   * [ADMIN] Lấy chi tiết blog post theo ID
   */
  getPostById: async (postId) => {
    const post = await BlogPost.findById(postId)
      .populate("category", "name slug")
      .populate("author", "name avatar");

    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    return {
      success: true,
      post,
    };
  },

  /**
   * [PUBLIC] Lấy danh sách blog posts đã publish
   */
  getPublicPosts: async (query = {}) => {
    const { page = 1, limit = 10, category, tag, search } = query;

    const filter = {
      status: "PUBLISHED",
      isActive: true,
      deletedAt: null,
    };

    if (category) {
      filter.category = category;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { publishedAt: -1 },
      populate: [
        { path: "category", select: "name slug" },
        { path: "author", select: "name avatar" },
      ],
    };

    return await paginate(BlogPost, filter, options);
  },

  /**
   * [PUBLIC] Lấy chi tiết blog post
   */
  getPostBySlug: async (slug) => {
    const post = await BlogPost.findOne({
      slug,
      status: "PUBLISHED",
      isActive: true,
      deletedAt: null,
    })
      .populate("category", "name slug")
      .populate("author", "name avatar");

    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Increment view count
    await BlogPost.findByIdAndUpdate(post._id, {
      $inc: { viewCount: 1 },
    });

    return {
      success: true,
      post,
    };
  },

  /**
   * [ADMIN] Tạo blog post
   */
  createPost: async (postData, authorId) => {
    // Generate slug
    const slug = createSlug(postData.title);

    // Kiểm tra slug trùng
    const existing = await BlogPost.findOne({ slug });
    if (existing) {
      throw new ApiError(409, "Tiêu đề bài viết đã tồn tại");
    }

    // Validate category
    if (postData.category) {
      const category = await BlogCategory.findById(postData.category);
      if (!category) {
        throw new ApiError(404, "Không tìm thấy danh mục blog");
      }
    }

    const post = await BlogPost.create({
      ...postData,
      slug,
      author: authorId,
    });

    return {
      success: true,
      message: "Tạo bài viết thành công",
      post,
    };
  },

  /**
   * [ADMIN] Cập nhật blog post
   */
  updatePost: async (postId, updateData, userId) => {
    const post = await BlogPost.findById(postId);

    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Update slug nếu title thay đổi
    if (updateData.title && updateData.title !== post.title) {
      const newSlug = createSlug(updateData.title);
      const slugExists = await BlogPost.findOne({
        slug: newSlug,
        _id: { $ne: postId },
      });

      if (slugExists) {
        throw new ApiError(409, "Tiêu đề bài viết đã tồn tại");
      }

      updateData.slug = newSlug;
    }

    // Update fields
    Object.assign(post, updateData);
    await post.save();

    return {
      success: true,
      message: "Cập nhật bài viết thành công",
      post,
    };
  },

  /**
   * [ADMIN] Xóa blog post
   */
  deletePost: async (postId, userId) => {
    const post = await BlogPost.findById(postId);

    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Xóa ảnh trên Cloudinary
    const cloudinary = require("@config/cloudinary");
    const imageService = require("./image.service");
    const imagesToDelete = [];

    // 1. Xóa thumbnail
    if (post.thumbnail?.public_id) {
      imagesToDelete.push(post.thumbnail.public_id);
    }

    // 2. Xóa featured image
    if (post.featuredImage?.public_id) {
      imagesToDelete.push(post.featuredImage.public_id);
    }

    // 3. Xóa tất cả ảnh trong markdown content
    if (post.content) {
      try {
        await imageService.deleteBlogContentImages(post.content);
      } catch (err) {
        console.error("Không thể xóa ảnh content:", err);
      }
    }

    // Xóa thumbnail và featured image
    if (imagesToDelete.length > 0) {
      try {
        await cloudinary.api.delete_resources(imagesToDelete);
      } catch (err) {
        console.error("Không thể xóa ảnh:", err);
      }
    }

    // Soft delete
    post.deletedAt = new Date();
    post.deletedBy = userId;
    post.isActive = false;
    await post.save();

    return {
      success: true,
      message: "Xóa bài viết thành công",
    };
  },
};

module.exports = blogService;
