import { verify } from "../packages/bundle/src";

verify.git.isClean();
verify.git.hasNoConflicts();
verify.git.isOnBranch("main");
