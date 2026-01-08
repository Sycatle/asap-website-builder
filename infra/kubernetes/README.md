# ASAP v2 - Kubernetes Configuration

Ce dossier contient les manifests Kubernetes pour déployer ASAP en production.

## Structure

```
kubernetes/
├── base/                   # Configuration de base (Kustomize)
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml        # Référence aux secrets (créés séparément)
│   ├── postgres/
│   ├── redis/
│   ├── api/
│   ├── worker/
│   ├── web/
│   ├── sites/
│   └── accounts/
├── overlays/               # Environnements spécifiques
│   ├── development/
│   ├── staging/
│   └── production/
└── README.md
```

## Pourquoi Kubernetes ?

### Avantages par rapport à Docker Compose

| Aspect | Docker Compose | Kubernetes |
|--------|---------------|------------|
| **Scaling** | Manuel (replicas: N) | Auto-scaling (HPA) basé sur CPU/RAM/custom metrics |
| **Haute disponibilité** | Single point of failure | Multi-node, self-healing, rolling updates |
| **Load Balancing** | Basique (round-robin) | Avancé (Ingress, Service Mesh) |
| **Secrets** | Variables d'env | Secrets cryptés, rotation, external secrets |
| **Réseau** | Bridge simple | Network policies, mTLS avec service mesh |
| **Stockage** | Volumes locaux | PersistentVolumes, StorageClasses, CSI |
| **Monitoring** | Manuel | Prometheus, Grafana intégrés |
| **CI/CD** | Scripts manuels | GitOps (ArgoCD, Flux) |
| **Multi-cloud** | Non | Oui, portable entre clouds |

### Cas d'usage ASAP

1. **Scaling automatique** : Quand le trafic augmente, K8s scale automatiquement les pods `web`, `sites`, et `api`
2. **Zero-downtime deployments** : Rolling updates sans interruption de service
3. **Isolation des tenants** : Namespaces séparés pour différents environnements
4. **Gestion des secrets** : JWT_SECRET, clés API stockés de manière sécurisée
5. **Observabilité** : Métriques, logs, traces centralisés

## Prérequis

- Cluster Kubernetes (local: minikube, kind, k3s | cloud: GKE, EKS, AKS)
- kubectl configuré
- Helm (optionnel, pour les charts)
- kustomize (inclus dans kubectl)

## Déploiement rapide

```bash
# Créer le namespace
kubectl apply -f base/namespace.yaml

# Créer les secrets (à faire une fois)
kubectl create secret generic asap-secrets \
  --from-literal=postgres-password=<password> \
  --from-literal=jwt-secret=<jwt-secret> \
  -n asap

# Déployer l'environnement de production
kubectl apply -k overlays/production

# Vérifier le déploiement
kubectl get pods -n asap
kubectl get services -n asap
kubectl get ingress -n asap
```

## Architecture en cluster

```
                    ┌─────────────────┐
                    │     Ingress     │
                    │   (nginx/traefik)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   web (4321)  │  │  sites (4322) │  │accounts (4323)│
│   Deployment  │  │   Deployment  │  │   Deployment  │
│   replicas: 2 │  │   replicas: 2 │  │   replicas: 2 │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌───────────────┐
                  │   api (3000)  │
                  │   Deployment  │
                  │   replicas: 3 │
                  └───────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────┐                  ┌───────────────┐
│   PostgreSQL  │                  │     Redis     │
│  StatefulSet  │                  │  StatefulSet  │
│  (PVC: 10Gi)  │                  │  (PVC: 1Gi)   │
└───────────────┘                  └───────────────┘

                  ┌───────────────┐
                  │    worker     │
                  │   Deployment  │
                  │   replicas: 2 │
                  └───────────────┘
```

## Commandes utiles

```bash
# Logs d'un service
kubectl logs -f deployment/asap-api -n asap

# Shell dans un pod
kubectl exec -it deployment/asap-api -n asap -- /bin/sh

# Port-forward pour debug local
kubectl port-forward svc/asap-api 3000:3000 -n asap

# Scaling manuel
kubectl scale deployment/asap-api --replicas=5 -n asap

# Rollback
kubectl rollout undo deployment/asap-api -n asap

# Status du rollout
kubectl rollout status deployment/asap-api -n asap
```

## Migration depuis Docker Compose

1. Les images Docker restent identiques
2. Les variables d'environnement deviennent ConfigMaps/Secrets
3. Les volumes deviennent PersistentVolumeClaims
4. Les ports exposés deviennent des Services + Ingress
5. `depends_on` devient des `initContainers` ou des probes

## Prochaines étapes

- [ ] Configurer cert-manager pour HTTPS automatique
- [ ] Ajouter Prometheus + Grafana pour le monitoring
- [ ] Configurer ArgoCD pour le GitOps
- [ ] Ajouter Network Policies pour l'isolation
- [ ] Configurer HPA (Horizontal Pod Autoscaler)
