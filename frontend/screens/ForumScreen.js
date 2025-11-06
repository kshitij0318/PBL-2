import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import { API_URL, apiRequest } from '../utils/config';
import { useAuth } from '../utils/AuthContext';
import { useRoleNotifications } from '../utils/NotificationContext';
import { useTheme, useResponsive } from '../utils/ThemeContext';
import { 
  ResponsiveText, 
  ResponsiveButton, 
  ResponsiveCard, 
  ResponsiveHeader,
  ResponsiveInput,
  ResponsiveSpacing 
} from '../utils/ResponsiveComponents';

const { width, height } = Dimensions.get('window');

const RolePill = ({ role }) => (
  <View style={[styles.rolePill, role === 'mother' ? styles.motherPill : styles.nursePill]}>
    <Text style={styles.rolePillText}>
      {role === 'mother' ? 'Mother' : role === 'nurse' ? 'Nurse' : role}
    </Text>
  </View>
);

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const PostItem = ({ item, onLike, onOpen, onComment }) => (
  <View style={styles.postCard}>
		<View style={styles.postHeader}>
      <View style={styles.postAuthorInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.display_name?.charAt(0).toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={styles.postMetadata}>
			<Text style={styles.authorName}>{item.display_name}</Text>
          <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </View>
			<RolePill role={item.author_role} />
		</View>
    
    <TouchableOpacity onPress={() => onOpen(item)} activeOpacity={0.7}>
		<Text style={styles.postContent}>{item.content}</Text>
			</TouchableOpacity>
    
    {item.is_flagged && (
      <View style={styles.flaggedBanner}>
        <Ionicons name="flag" size={14} color="#FF6B35" />
        <Text style={styles.flaggedText}>Content flagged for review</Text>
		</View>
    )}
    
    <View style={styles.postActions}>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => onLike(item)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={item.user_liked ? "heart" : "heart-outline"} 
          size={20} 
          color={item.user_liked ? "#FF6B6B" : "#666"} 
        />
        <Text style={[styles.actionText, item.user_liked && styles.likedText]}>
          {item.like_count || 0}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => onComment(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubble-outline" size={20} color="#666" />
        <Text style={styles.actionText}>{item.comment_count || 0}</Text>
      </TouchableOpacity>
      
			{(item.is_owner || item.can_admin) && (
        <View style={styles.ownerActions}>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => onOpen({ ...item, _action: 'edit' })}
          >
            <Ionicons name="create-outline" size={16} color="#007AFF" />
					</TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => onOpen({ ...item, _action: 'delete' })}
          >
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
					</TouchableOpacity>
        </View>
			)}
		</View>
  </View>
);

// Comment Component for nested replies
const CommentItem = ({ comment, onLike, onReply, depth = 0 }) => (
  <View style={[styles.commentContainer, { marginLeft: depth * 20 }]}>
    <View style={styles.commentHeader}>
      <View style={styles.commentAuthorInfo}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>
            {comment.display_name?.charAt(0).toUpperCase() || 'A'}
          </Text>
        </View>
        <Text style={styles.commentAuthor}>{comment.display_name}</Text>
        <RolePill role={comment.author_role} />
      </View>
      <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
    </View>
    <Text style={styles.commentContent}>{comment.content}</Text>
    <View style={styles.commentActions}>
      <TouchableOpacity 
        style={styles.commentActionButton} 
        onPress={() => onLike(comment)}
      >
        <Ionicons name="heart-outline" size={16} color="#666" />
        <Text style={styles.commentActionText}>{comment.like_count || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.commentActionButton} 
        onPress={() => onReply(comment)}
      >
        <Ionicons name="arrow-undo-outline" size={16} color="#666" />
        <Text style={styles.commentActionText}>Reply</Text>
	</TouchableOpacity>
    </View>
  </View>
);

export default function ForumScreen({ navigation }) {
    const { userInfo } = useAuth();
  const { theme } = useTheme();
  const { responsive, isSmallScreen } = useResponsive();
  const { 
    notifySuccess, 
    notifyError, 
    notifyForumActivity, 
    notifyRealtime 
  } = useRoleNotifications();
	const [posts, setPosts] = useState([]);
	const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const isAnonymous = true;
	const socketRef = useRef(null);

	const token = userInfo?.token;

  const loadPosts = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await apiRequest('/api/forum/posts?limit=50&offset=0', token);
      setPosts(data.posts || []);
    } catch (e) {
      notifyError(e.message || 'Failed to load posts');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadComments = async (postId) => {
    try {
      const data = await apiRequest(`/api/forum/posts/${postId}/comments`, token);
      setComments(data.comments || []);
    } catch (e) {
      notifyError('Failed to load comments');
    }
	};

	const connectSocket = () => {
		if (socketRef.current) return;
		socketRef.current = io(API_URL, { transports: ['websocket'], forceNew: true });
    
		socketRef.current.on('forum:new_post', (post) => {
			setPosts((prev) => [post, ...prev.filter(p => p.id !== post.id)]);
      // Only notify if it's not the current user's post
      if (post.author_id !== userInfo?.id) {
        notifyForumActivity('new_post', `New post by ${post.display_name}`);
      }
    });
    
    socketRef.current.on('forum:new_comment', (comment) => {
      if (selectedPost && comment.post_id === selectedPost.id) {
        setComments((prev) => [...prev, comment]);
      }
      // Update comment count in posts
      setPosts((prev) => prev.map(p => 
        p.id === comment.post_id 
          ? { ...p, comment_count: (p.comment_count || 0) + 1 }
          : p
      ));
      // Only notify if it's not the current user's comment
      if (comment.author_id !== userInfo?.id) {
        notifyForumActivity('new_comment', `New comment by ${comment.display_name}`);
      }
    });
    
    socketRef.current.on('forum:like', ({ post_id, like_count, user_id }) => {
      setPosts((prev) => prev.map(p => 
        p.id === post_id ? { ...p, like_count } : p
      ));
      // Notify post author if someone else liked their post
      if (user_id !== userInfo?.id) {
        const post = posts.find(p => p.id === post_id);
        if (post && post.author_id === userInfo?.id) {
          notifyForumActivity('new_like', 'Someone liked your post!');
        }
      }
    });
    
    socketRef.current.on('forum:moderation_alert', (payload) => {
      const message = `Moderation alert: ${payload.type}`;
      if (payload.severity === 'high') {
        notifyError(message, { duration: 6000 });
      } else {
        notifyForumActivity('moderation_alert', payload.type);
      }
    });
	};

	useEffect(() => {
		if (!token) return;
		loadPosts();
		connectSocket();
		return () => {
			if (socketRef.current) {
				socketRef.current.disconnect();
				socketRef.current = null;
			}
		};
	}, [token]);

	const submitPost = async () => {
		if (!content.trim()) return;
    
		const optimistic = {
      id: `temp_${Date.now()}`,
			content,
			created_at: new Date().toISOString(),
			like_count: 0,
      comment_count: 0,
			author_role: userInfo?.role,
			is_anonymous: isAnonymous,
      display_name: isAnonymous 
        ? `Anonymous ${userInfo?.role?.charAt(0).toUpperCase() + userInfo?.role?.slice(1)}` 
        : userInfo?.full_name,
			is_flagged: false,
      is_owner: true,
		};

		setPosts((prev) => [optimistic, ...prev]);
		setContent('');

		try {
      const data = await apiRequest('/api/forum/posts', token, { 
        method: 'POST', 
        body: { content: optimistic.content, is_anonymous: isAnonymous } 
      });
			setPosts((prev) => [data.post, ...prev.filter(p => p.id !== optimistic.id)]);
      notifySuccess('Post published successfully!');
		} catch (e) {
			setPosts((prev) => prev.filter(p => p.id !== optimistic.id));
      notifyError(e.message || 'Failed to publish post');
		}
	};

	const likePost = async (post) => {
    const wasLiked = post.user_liked;
    const optimisticUpdate = {
      ...post,
      user_liked: !wasLiked,
      like_count: wasLiked ? (post.like_count || 0) - 1 : (post.like_count || 0) + 1
    };

    setPosts((prev) => prev.map(p => p.id === post.id ? optimisticUpdate : p));

		try {
			const data = await apiRequest(`/api/forum/posts/${post.id}/like`, token, { method: 'POST' });
      setPosts((prev) => prev.map(p => 
        p.id === post.id ? { ...p, like_count: data.like_count, user_liked: data.user_liked } : p
      ));
    } catch (e) {
      setPosts((prev) => prev.map(p => p.id === post.id ? post : p));
      notifyError('Failed to update like');
    }
  };

  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');

  const openPostDetail = (post) => {
    if (post._action === 'edit') {
      setEditingPost(post);
      setEditContent(post.content);
      return;
    }
    if (post._action === 'delete') {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => deletePost(post)
          }
        ]
      );
      return;
    }
    
    setSelectedPost(post);
    setShowPostDetail(true);
    loadComments(post.id);
  };

  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;
    
    try {
      const data = await apiRequest(`/api/forum/posts/${editingPost.id}`, token, {
        method: 'PATCH',
        body: { content: editContent.trim() }
      });
      
      setPosts((prev) => prev.map(p => 
        p.id === editingPost.id ? { ...p, content: editContent.trim(), ...data.post } : p
      ));
      setEditingPost(null);
      setEditContent('');
      notifySuccess('Post updated successfully!');
    } catch (e) {
      notifyError(e.message || 'Failed to update post');
    }
  };

  const deletePost = async (post) => {
    try {
      await apiRequest(`/api/forum/posts/${post.id}`, token, { method: 'DELETE' });
      setPosts((prev) => prev.filter(p => p.id !== post.id));
      notifySuccess('Post deleted');
    } catch (e) {
      notifyError('Failed to delete post');
    }
  };

  const submitComment = async () => {
    if (!commentContent.trim() || !selectedPost) return;

    const optimisticComment = {
      id: `temp_${Date.now()}`,
      content: commentContent,
      created_at: new Date().toISOString(),
      author_role: userInfo?.role,
      display_name: isAnonymous 
        ? `Anonymous ${userInfo?.role?.charAt(0).toUpperCase() + userInfo?.role?.slice(1)}` 
        : userInfo?.full_name,
      like_count: 0,
      parent_id: replyingTo?.id || null,
    };

    setComments((prev) => [...prev, optimisticComment]);
    setCommentContent('');
    setReplyingTo(null);

    try {
      const data = await apiRequest(`/api/forum/posts/${selectedPost.id}/comments`, token, {
        method: 'POST',
        body: { 
          content: optimisticComment.content, 
          is_anonymous: isAnonymous,
          parent_id: optimisticComment.parent_id 
        }
      });
      setComments((prev) => [...prev.filter(c => c.id !== optimisticComment.id), data.comment]);
      notifySuccess('Comment posted!');
		} catch (e) {
      setComments((prev) => prev.filter(c => c.id !== optimisticComment.id));
      notifyError('Failed to post comment');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts(false);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ResponsiveCard style={styles.loadingContent}>
            <View style={styles.loadingIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.primary} />
            </View>
            <ResponsiveText size="lg" weight="semibold" align="center" style={{ marginBottom: responsive.spacing.xs }}>
              Loading Community
            </ResponsiveText>
            <ResponsiveText size="sm" color={theme.textSecondary} align="center" style={{ marginBottom: responsive.spacing.base }}>
              Fetching latest posts and discussions...
            </ResponsiveText>
            <View style={[styles.loadingBar, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={[styles.loadingBarFill, { backgroundColor: theme.primary }]} />
            </View>
          </ResponsiveCard>
        </View>
      </SafeAreaView>
    );
  }

	return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Enhanced Responsive Header */}
        <ResponsiveHeader
          title="Community Forum"
          leftIcon="arrow-back"
          rightIcon="refresh"
          onLeftPress={() => {
            if (userInfo?.role === 'mother') navigation.navigate('MotherDashboard');
            else if (userInfo?.role === 'nurse') navigation.navigate('Home');
            else if (userInfo?.is_admin || userInfo?.role === 'admin') navigation.navigate('AdminDashboard');
            else navigation.goBack();
          }}
          onRightPress={() => loadPosts()}
        />

        {/* Posts List */}
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PostItem 
              item={item} 
              onLike={likePost} 
              onOpen={openPostDetail}
              onComment={openPostDetail}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[
            styles.postsList, 
            posts.length === 0 && styles.emptyListContent
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            !loading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
                </View>
                <Text style={styles.emptyStateTitle}>No posts yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Be the first to start a conversation in the community!
                </Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => {
                    // Focus on the input field (you can add a ref if needed)
                  }}
                >
                  <Text style={styles.emptyStateButtonText}>Create First Post</Text>
				</TouchableOpacity>
              </View>
            )
          )}
        />

        {/* Enhanced Fixed Input Area */}
        <View style={[
          styles.inputContainer, 
          { 
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: Math.max(responsive.spacing.base, theme.safeArea?.bottom || 0) + responsive.spacing.sm,
          }
        ]}>
          <ResponsiveSpacing size="xs" />
          <ResponsiveText 
            size="sm" 
            color={theme.textSecondary}
            style={{ marginBottom: responsive.spacing.xs }}
          >
            Posting as: Anonymous {userInfo?.role === 'nurse' ? 'Nurse' : 'Mother'}
          </ResponsiveText>
          
          <View style={styles.inputRow}>
            <ResponsiveInput
              placeholder="Share your thoughts with the community..."
              value={content}
              onChangeText={setContent}
              multiline
              style={{ flex: 1, marginRight: responsive.spacing.sm }}
              maxLength={500}
            />
            <ResponsiveButton
              onPress={submitPost}
              disabled={!content.trim()}
              size="medium"
              style={{ minWidth: responsive.touchTarget.comfortable }}
            >
              <Ionicons name="send" size={18} color={theme.textInverse} />
            </ResponsiveButton>
          </View>
        </View>

        {/* Edit Post Modal */}
        <Modal
          visible={!!editingPost}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setEditingPost(null);
                  setEditContent('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <View style={styles.headerRight} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.editContainer}>
                <Text style={styles.editLabel}>Post Content</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Edit your post..."
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  numberOfLines={8}
                  maxLength={500}
                />
                <Text style={styles.charCount}>
                  {editContent.length}/500 characters
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editCancelButton]}
                onPress={() => {
                  setEditingPost(null);
                  setEditContent('');
                }}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveButton, !editContent.trim() && styles.editSaveButtonDisabled]}
                onPress={handleEditPost}
                disabled={!editContent.trim()}
              >
                <Text style={styles.editSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Post Detail Modal */}
        <Modal
          visible={showPostDetail}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowPostDetail(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              <Text style={styles.modalTitle}>Post & Comments</Text>
              <View style={styles.headerRight} />
            </View>

            {selectedPost && (
              <ScrollView style={styles.modalContent}>
                <PostItem 
                  item={selectedPost} 
                  onLike={likePost} 
                  onOpen={() => {}}
                  onComment={() => {}}
                />
                
                <View style={styles.commentsSection}>
                  <Text style={styles.commentsTitle}>
                    Comments ({comments.length})
                  </Text>
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onLike={() => {}}
                      onReply={setReplyingTo}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              {replyingTo && (
                <View style={styles.replyingToContainer}>
                  <Text style={styles.replyingToText}>
                    Replying to {replyingTo.display_name}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChangeText={setCommentContent}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.commentSendButton, !commentContent.trim() && styles.sendButtonDisabled]} 
                  onPress={submitComment}
                  disabled={!commentContent.trim()}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
		</View>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
	);
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerRight: {
    width: 40,
  },

  // Posts List
  postsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // Space for fixed input
  },

  // Post Card
  postCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  postAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  postMetadata: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  postTime: {
    fontSize: 14,
    opacity: 0.7,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },

  // Role Pills
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  motherPill: {
    backgroundColor: '#FCE7F3',
  },
  nursePill: {
    backgroundColor: '#DBEAFE',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },

  // Flagged Content
  flaggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  flaggedText: {
    fontSize: 13,
    color: '#FF6B35',
    marginLeft: 6,
    fontWeight: '500',
  },

  // Post Actions
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 12,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  likedText: {
    color: '#FF6B6B',
  },
  ownerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e0f2fe',
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },

  // Fixed Input Container
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  inputHeader: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxHeight: 100,
    marginRight: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Comments Section
  commentsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },

  // Comment Item
  commentContainer: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e9ecef',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 11,
    color: '#666',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  commentActionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },

  // Comment Input
  commentInputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
    fontSize: 14,
  },
  commentSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },

  // Empty States
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 120, // Account for fixed input at bottom
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    padding: 16,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  editActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginRight: 12,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  editSaveButtonDisabled: {
    opacity: 0.5,
  },
  editSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
