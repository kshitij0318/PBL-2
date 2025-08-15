import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Switch, // Added for the anonymity toggle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext'; // Assuming this is your auth context path
import { API_URL } from '../utils/config'; // Assuming this is your API config path

// Consistent theme colors from your other files
const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  error: '#dc3545',
};

// Mock data to simulate API response.
const MOCK_POSTS = [
  {
    id: '1',
    author: { name: 'Jane Doe', avatar: 'person-circle-outline' },
    timestamp: '2 hours ago',
    content: 'Feeling the first kicks! Such a magical moment. Anyone else experience this recently?',
    likes: 15,
    comments: 3,
    isLiked: false, // New property to track if the user liked this post
  },
  {
    id: '2',
    author: { name: 'Anonymous', avatar: 'person-circle-outline' }, // Example of an anonymous user
    timestamp: '5 hours ago',
    content: 'Any tips for dealing with morning sickness in the second trimester? It just came back for me!',
    likes: 8,
    comments: 5,
    isLiked: true,
  },
  {
    id: '3',
    author: { name: 'Emily Jones', avatar: 'person-circle-outline' },
    timestamp: '1 day ago',
    content: 'Just finished setting up the nursery. Feeling so excited and a little bit nervous. The due date is getting so close!',
    likes: 22,
    comments: 7,
    isLiked: false,
  },
];


/**
 * Represents a single post item in the forum list.
 */
const PostItem = ({ item, onPress, onLike }) => (
  <TouchableOpacity style={styles.postCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.postHeader}>
      <Ionicons name={item.author.avatar} size={32} color={themeColors.primary} />
      <View style={styles.postAuthorInfo}>
        <Text style={styles.postAuthorName}>{item.author.name}</Text>
        <Text style={styles.postTimestamp}>{item.timestamp}</Text>
      </View>
    </View>
    <Text style={styles.postContent}>{item.content}</Text>
    <View style={styles.postFooter}>
      {/* --- FEATURE: Like/Support Button --- */}
      <TouchableOpacity style={styles.footerAction} onPress={() => onLike(item.id)}>
        <Ionicons 
          name={item.isLiked ? "heart" : "heart-outline"} 
          size={20} 
          color={item.isLiked ? themeColors.primary : themeColors.placeholder} 
        />
        <Text style={[styles.footerActionText, item.isLiked && { color: themeColors.primary }]}>
          {item.likes} Likes
        </Text>
      </TouchableOpacity>
      {/* --- FEATURE: Commenting --- */}
      <View style={styles.footerAction}>
        <Ionicons name="chatbubble-outline" size={20} color={themeColors.placeholder} />
        <Text style={styles.footerActionText}>{item.comments} Comments</Text>
      </View>
    </View>
  </TouchableOpacity>
);


export default function CommunityForumScreen({ navigation }) {
  const { userInfo } = useAuth();
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [newPostContent, setNewPostContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [postAnonymously, setPostAnonymously] = React.useState(false); // State for anonymity switch

  const fetchPosts = async () => {
    try {
      setError(null);
      // Using mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPosts(MOCK_POSTS);
    } catch (e) {
      console.error("Failed to fetch posts:", e);
      setError("Couldn't load the feed. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // --- FEATURE: Real-time Updates ---
  React.useEffect(() => {
    // Initial fetch
    fetchPosts();

    // --- TODO: Set up your real-time listener here ---
    // This is where you would connect to a WebSocket or a service like Firebase
    // to listen for new posts, likes, and comments.
    // For example:
    // const unsubscribe = setupRealtimeListener(newPost => {
    //   setPosts(prevPosts => [newPost, ...prevPosts]);
    // });
    //
    // return () => unsubscribe(); // Cleanup listener on component unmount
  }, []);


  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, []);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  /**
   * Handles toggling the like status of a post.
   */
  const handleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        // --- TODO: Send API request to like/unlike the post ---
        return { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 };
      }
      return post;
    }));
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert("Post content cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newPost = {
        id: Math.random().toString(),
        author: { 
          name: postAnonymously ? 'Anonymous' : (userInfo?.full_name || 'You'), 
          avatar: 'person-circle-outline' 
        },
        timestamp: 'Just now',
        content: newPostContent.trim(),
        likes: 0,
        comments: 0,
        isLiked: false,
      };
      // For a real-time app, the new post would come from the listener,
      // but we add it manually here for demonstration.
      setPosts([newPost, ...posts]);
      setNewPostContent('');
      setPostAnonymously(false);
      toggleModal();

    } catch (e) {
      console.error("Failed to create post:", e);
      alert("Couldn't create the post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading Community Feed...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={themeColors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPosts}>
            <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
          <Text style={styles.headerTitle}>Community Forum</Text>
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostItem 
            item={item} 
            onLike={handleLike}
            onPress={() => {
              // TODO: Navigate to a detailed post screen for commenting
              alert(`Navigate to comments for post by ${item.author.name}.`);
            }} 
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
            </View>
        )}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={toggleModal}>
        <Ionicons name="add" size={32} color={themeColors.white} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardAvoidingView}
        >
            <View style={styles.modalView}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create a New Post</Text>
                    <TouchableOpacity onPress={toggleModal}>
                        <Ionicons name="close-circle" size={28} color={themeColors.placeholder} />
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={styles.modalInput}
                    placeholder="Share your thoughts or ask a question..."
                    multiline
                    value={newPostContent}
                    onChangeText={setNewPostContent}
                />
                {/* --- FEATURE: Anonymity Option --- */}
                <View style={styles.anonymityContainer}>
                    <Text style={styles.anonymityLabel}>Post Anonymously</Text>
                    <Switch
                        trackColor={{ false: "#767577", true: themeColors.lightPrimary }}
                        thumbColor={postAnonymously ? themeColors.primary : "#f4f3f4"}
                        onValueChange={() => setPostAnonymously(previousState => !previousState)}
                        value={postAnonymously}
                    />
                </View>
                <TouchableOpacity 
                    style={[styles.modalButton, isSubmitting && styles.buttonDisabled]} 
                    onPress={handleCreatePost}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={themeColors.white} />
                    ) : (
                        <Text style={styles.modalButtonText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: themeColors.white,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.lightPrimary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.darkText,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.placeholder,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: themeColors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  postCard: {
    backgroundColor: themeColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthorInfo: {
    marginLeft: 10,
  },
  postAuthorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.darkText,
  },
  postTimestamp: {
    fontSize: 12,
    color: themeColors.placeholder,
  },
  postContent: {
    fontSize: 15,
    color: themeColors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: themeColors.lightBackground,
    paddingTop: 12,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  footerActionText: {
    marginLeft: 6,
    fontSize: 14,
    color: themeColors.placeholder,
  },
  emptyText: {
    fontSize: 16,
    color: themeColors.placeholder,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: themeColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.darkText,
  },
  modalInput: {
    backgroundColor: themeColors.lightBackground,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  anonymityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  anonymityLabel: {
    fontSize: 16,
    color: themeColors.darkText,
  },
  modalButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  }
});
