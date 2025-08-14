

'use client';

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Star, Eye, EyeOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { ProductReview } from "@/types";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { updateReviewAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "../ui/badge";

const ITEMS_PER_PAGE = 10;

interface ReviewsPageClientProps {
    initialReviews: ProductReview[];
}

export default function ReviewsPageClient({ initialReviews }: ReviewsPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [allReviews, setAllReviews] = useState<ProductReview[]>(initialReviews);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [reviewToToggle, setReviewToToggle] = useState<ProductReview | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [ratingFilter, setRatingFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("visible");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => { 
        setAllReviews(initialReviews);
    }, [initialReviews]);
    
    useEffect(() => { setCurrentPage(1); }, [searchTerm, ratingFilter, activeTab]);

    const filteredReviews = useMemo(() => {
        return allReviews.filter(review => {
            const searchMatch = review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                review.text.toLowerCase().includes(searchTerm.toLowerCase());
            const ratingMatch = ratingFilter === 'all' || review.rating === parseInt(ratingFilter, 10);
            const statusMatch = (activeTab === 'visible' ? review.status === 'Visible' : review.status === 'Oculto');
            return searchMatch && ratingMatch && statusMatch;
        });
    }, [allReviews, searchTerm, ratingFilter, activeTab]);

    const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
    const paginatedReviews = useMemo(() => filteredReviews.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredReviews, currentPage]);

    const handleToggleStatus = (review: ProductReview) => {
      setReviewToToggle(review);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!reviewToToggle) return;

      const newStatus = reviewToToggle.status === 'Visible' ? 'Oculto' : 'Visible';
      const result = await updateReviewAction(reviewToToggle.productId, { ...reviewToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Reseña ${newStatus === 'Visible' ? 'hecha visible' : 'ocultada'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }

      setIsConfirmOpen(false);
      setReviewToToggle(null);
    };

    const StarRating = ({ rating }: { rating: number }) => (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
            ))}
        </div>
    );
    
    const renderTable = (reviewsToRender: ProductReview[]) => (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Autor</TableHead>
                            <TableHead>Calificación</TableHead>
                            <TableHead>Reseña</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reviewsToRender.length > 0 ? (
                            reviewsToRender.map((review) => (
                                <TableRow key={`${review.productId}-${review.id}`}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Image
                                                alt={review.productName}
                                                className="aspect-square rounded-md object-cover"
                                                height="48"
                                                src={review.productImage}
                                                width="48"
                                            />
                                            <Link href={`/product/${review.productId}`} className="font-medium hover:underline truncate" title={review.productName}>
                                                {review.productName}
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{review.author}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><StarRating rating={review.rating} /></TableCell>
                                    <TableCell className="max-w-xs truncate" title={review.text}>{review.text}</TableCell>
                                    <TableCell>
                                        <Badge variant={review.status === 'Visible' ? 'default' : 'secondary'}>{review.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleToggleStatus(review)}>
                                                  {review.status === 'Visible' ? 
                                                      <><EyeOff className="mr-2 h-4 w-4"/> Ocultar</> : 
                                                      <><Eye className="mr-2 h-4 w-4"/> Hacer Visible</>
                                                  }
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No se han encontrado reseñas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-6">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{paginatedReviews.length}</strong> de <strong>{filteredReviews.length}</strong> reseñas.
                    </div>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                            </PaginationItem>
                            <PaginationItem>
                                <span className="text-sm font-medium mx-2">
                                    Página {currentPage} de {totalPages}
                                </span>
                            </PaginationItem>
                            <PaginationItem>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Siguiente</Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    );

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-secondary p-3 rounded-full border">
                        <Star className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Reseñas de Productos</h1>
                        <p className="text-muted-foreground">Modera y gestiona las reseñas de los clientes.</p>
                    </div>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Input 
                            placeholder="Buscar por producto, autor o reseña..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                            <SelectTrigger className="sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por calificación" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="5">5 Estrellas</SelectItem>
                                <SelectItem value="4">4 Estrellas</SelectItem>
                                <SelectItem value="3">3 Estrellas</SelectItem>
                                <SelectItem value="2">2 Estrellas</SelectItem>
                                <SelectItem value="1">1 Estrella</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="visible">Visibles</TabsTrigger>
                            <TabsTrigger value="hidden">Ocultas</TabsTrigger>
                        </TabsList>
                        <TabsContent value="visible" className="mt-4">
                            {renderTable(paginatedReviews)}
                        </TabsContent>
                        <TabsContent value="hidden" className="mt-4">
                            {renderTable(paginatedReviews)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescriptionComponent>
                    Vas a {reviewToToggle?.status === 'Visible' ? 'ocultar' : 'hacer visible'} esta reseña.
                  </AlertDialogDescriptionComponent>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggleStatus}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
