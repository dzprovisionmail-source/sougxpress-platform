import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Store as StoreIcon, Clock3, ChartColumn } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId } from "@/services/store.service";
import useStore from "@/hooks/useStore";
import { Store } from "@/types/schema-03-core";
import StoreImageGallery from "@/components/profile/StoreImageGallery";
import StoreProductManagement from "@/components/profile/StoreProductManagement";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

export default function MerchantStoreScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getStoreByMerchantId(userId).then((store: Store | null) => {
      setStoreId(store?.id);
      setResolving(false);
    });
  }, [userId]);

  const { store, galleryImages, loading, handleImageUpload, handleImageDelete } = useStore(storeId || "");

  if (resolving || (storeId && loading)) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل المتجر..." />
      </WorkspaceScreen>
    );
  }

  if (!storeId || !store) {
    return (
      <WorkspaceScreen>
        <EmptyState message="لم يتم إنشاء متجرك بعد." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}>
        <SectionCard>
          <SectionTitle icon={<StoreIcon color={colors.primary} size={tokens.spacing.lg} />}>
            معلومات المتجر
          </SectionTitle>
          <WorkspaceRow label="اسم المتجر" value={store.name} />
          <WorkspaceRow label="الفئة" value={store.category} />
          <WorkspaceRow
            label="الحالة"
            value={store.status === "active" ? "🟢 مفتوح" : "🔴 غير نشط"}
            isLast
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Clock3 color={colors.primary} size={tokens.spacing.lg} />}>
            أوقات العمل
          </SectionTitle>
          <WorkspaceRow label="وقت الفتح" value={store.opens_at} />
          <WorkspaceRow label="وقت الغلق" value={store.closes_at} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<ChartColumn color={colors.primary} size={tokens.spacing.lg} />}>
            معرض الصور
          </SectionTitle>
          <StoreImageGallery
            storeId={store.id}
            images={galleryImages}
            isMerchantView
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
          />
        </SectionCard>

        <SectionCard>
          <StoreProductManagement
            isMerchantView
            onManageProducts={() => {}}
            onAddProduct={() => {}}
            onEditProduct={() => {}}
            onDeleteProduct={() => {}}
          />
        </SectionCard>
      </ScrollView>
    </WorkspaceScreen>
  );
}
