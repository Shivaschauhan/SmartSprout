import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from core.config import settings

# Global variable to store the retriever so we don't rebuild it on every request
_retriever = None

def get_rag_retriever():
    global _retriever
    if _retriever is not None:
        return _retriever

    kb_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base")
    
    # Load documents
    loader = DirectoryLoader(kb_dir, glob="**/*.txt", loader_cls=TextLoader)
    documents = loader.load()

    # Split documents
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    docs = text_splitter.split_documents(documents)

    embeddings = GoogleGenerativeAIEmbeddings(
        model=settings.GEMINI_EMBEDDING_MODEL,
        google_api_key=settings.GEMINI_API_KEY
    )
    
    vectorstore = FAISS.from_documents(docs, embeddings)
    
    # Create retriever
    _retriever = vectorstore.as_retriever(
        search_kwargs={"k": 3}
    )
    
    return _retriever
